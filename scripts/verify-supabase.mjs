import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {encode} from 'next-auth/jwt';
import pg from 'pg';
const origin=process.env.TEST_ORIGIN || 'http://localhost:2021';
if (!/^http:\/\/localhost:\d+$/.test(origin)) throw new Error('Tests require a local server');
const marker=randomUUID();
const email=`migration-test-${marker}@example.invalid`;
const outsider=`outsider-${marker}@example.invalid`;
const secret=process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
assert(secret,'Missing auth secret');
async function cookie(email) { return `authjs.session-token=${await encode({secret,salt:'authjs.session-token',token:{email,name:'Migration test'},maxAge:600})}`; }
const ownCookie=await cookie(email), otherCookie=await cookie(outsider);
const pool=new pg.Pool({host:process.env.SUPABASE_DB_HOST,port:Number(process.env.SUPABASE_DB_PORT),user:process.env.SUPABASE_DB_USER,password:process.env.SUPABASE_PASSWORD_DB,database:'postgres',ssl:{rejectUnauthorized:true,ca:readFileSync('supabase/certs/prod-ca-2021.crt','utf8')},connectionTimeoutMillis:10000});
let checks=0;
async function request(path,method='GET',body,session=ownCookie,status=200) {
 const r=await fetch(origin+path,{method,headers:{'Content-Type':'application/json',cookie:session},body:body===undefined?undefined:JSON.stringify(body)});
 const value=await r.json();
 assert.equal(r.status,status,`${method} ${path}: ${JSON.stringify(value)}`);checks++;
 return value;
}
try {
 await request('/api/categories/get-categories','GET',undefined,'',401);
 assert.deepEqual(await request('/api/categories/get-categories'),[]);
 await request('/api/categories/add-category','POST','Verduras');
 let [category]=await request('/api/categories/get-categories');assert(category.id);
 await request('/api/categories/edit-category','PUT',{idCategory:category.id,newNameCategory:'Frutas'});
 assert.equal((await request('/api/categories/get-categories'))[0].name,'Frutas');
 await request('/api/products/add-product','POST',{name:'Manzanas',idCategory:category.id});
 let [product]=await request('/api/products/get-products');assert.equal(product.checked,false);
 await request('/api/categories/delete-category','DELETE',category.id,ownCookie,409);
 assert.deepEqual(await request('/api/products/get-products','GET',undefined,otherCookie),[]);
 await request('/api/products/edit-name-product','PUT',{idProduct:product.id,newNameProduct:'Peras'},otherCookie,404);
 await request('/api/products/edit-name-product','PUT',{idProduct:product.id,newNameProduct:'Peras'});
 await request('/api/products/edit-checked-product','PUT',{idProduct:product.id,checked:true});
 assert.equal((await request('/api/products/get-products'))[0].checked,true);
 const grouped=await request('/api/products/get-products-by-categories');assert.equal(grouped[category.id][0].name,'Peras');
 assert.equal((await request('/api/products/get-products-by-category','POST',{id_category:category.id})).length,1);
 await Promise.all([request('/api/list/add-list','POST'),request('/api/list/add-list','POST')]);
 let list=await request('/api/list/get-list');assert.equal(list.length,1);
 const item=list[0];
 await request('/api/list/update-multiple-products','PUT',[{id:item.id,cantidad:2,medida:0.5,precio:0}]);
 assert.equal((await request('/api/list/get-list'))[0].cantidad,'2');
 await request('/api/list/set-bought','PUT',{idList:item.id,cantidad:2,medida:0,precio:100},ownCookie,400);
 await request('/api/list/set-bought','PUT',{idList:item.id,cantidad:2,medida:0.5,precio:100},otherCookie,404);
 await request('/api/list/set-bought','PUT',{idList:item.id,cantidad:2,medida:0.5,precio:100});
 list=await request('/api/list/get-list');assert.equal(list[0].comprado,'1');assert.equal(list[0].kgTotal,'1');
 assert.match(list[0].precioTotal,/200/);assert.match(list[0].precioKg,/200/);
 const before=await pool.query('select household_id from user_preferences where email=$1',[email]);const h=before.rows[0].household_id;
 await Promise.all([request('/api/historical/add-historical','POST'),request('/api/historical/add-historical','POST')]);
 assert.deepEqual(await request('/api/list/get-list'),[]);
 assert.equal((await request('/api/products/get-products'))[0].checked,false);
 const history=await pool.query('select purchase from historical where household_id=$1',[h]);
 assert.equal(history.rowCount,1);assert.equal(history.rows[0].purchase.precio_total,200);
 await request('/api/products/edit-checked-products','PUT',[{...product,checked:true}]);
 await request('/api/list/add-list','POST');
 await request('/api/products/un-check-products','PUT');
 assert.equal((await request('/api/products/get-products'))[0].checked,true,'Unbought products stay selected');
 await request('/api/products/delete-product-by-id','DELETE',product.id);
 assert.deepEqual(await request('/api/list/get-list'),[]);
 await request('/api/categories/delete-category','DELETE',category.id);
 for(const path of ['/logistic','/logistic/add','/logistic/admin','/logistic/admin/categories','/logistic/admin/products','/logistic/data']) {
  const r=await fetch(origin+path,{headers:{cookie:ownCookie}});assert.equal(r.status,200,path);const html=await r.text();assert(!html.includes('NEXT_REDIRECT'),path);checks++;
 }
 console.log(`PASS: ${checks} HTTP checks; numeric purchases, atomic archive, concurrency, ownership isolation, all application pages`);
} finally {
 // Delete only the isolated synthetic fixtures created by this test.
 await pool.query('delete from user_preferences where email=any($1::text[])',[[email,outsider]]);
 await pool.query('delete from households where owner_email=any($1::text[])',[[email,outsider]]);
 await pool.end();
}
