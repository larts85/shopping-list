// node --experimental-strip-types scripts/verify-product-units.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {suggestProductUnit} from '../app/lib/productUnits.ts';
const cases=[['Banana 🍌','kg'],['Queso Sardo 🧀','kg'],['Pollo','kg'],['Uvas','kg'],['Leche','lt'],['Vino','lt'],['Jugo manzana','lt'],['Crema de leche','ml'],['Almendras','g'],['Maní tostado sin sal','g'],['Queso crema (pote 290 g)','un'],['Leche (caja 1 l)','un'],['Filamento PLA (bobina 1 kg)','un'],['Jarra térmica 2,5 litros','un'],['Prensa 15 kg','un'],['Lavandina (bidón 2 l)','un'],['Leche en polvo','un']];
for(const [name,expected] of cases) assert.equal(suggestProductUnit(name),expected,name);
const catalog=JSON.parse(readFileSync(new URL('../data/argentina-catalog.json',import.meta.url),'utf8'));
for(const p of catalog) assert.equal(suggestProductUnit(p.name,p.category),p.unit,p.name);
console.log(`PASS: ${cases.length} selling-unit edge cases and ${catalog.length} catalog defaults`);
