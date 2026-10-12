import assert from "node:assert/strict";
import {
  parseRawItemList,
  parseAndClassifyList,
  classifyItem,
} from "../app/lib/itemClassification.ts";

const sampleInput = `1-Control
2- Extensión
3- Cortador pastillas
4- Cortina de baño
5- Mantel p mesa
6- 2 Jgos sábanas contul
7-Machacador de ajos
8-Abridor p latas y botellas
9- Gavetero de 4 gavetas
10-Soga p tender
11- Escurridor de platos
12-Jarro mediano no esmaltado
13-Colador
14-Embudo
15-2 Almohadones grandes
16-Cubo`;

const categories = [
  { id: "cat-verduleria", name: "Verdulería" },
  { id: "cat-carnicos", name: "Carnicos" },
  { id: "cat-pescaderia", name: "Pescadería" },
  { id: "cat-lacteos", name: "Lácteos" },
  { id: "cat-fiambreria", name: "Fiambrería" },
  { id: "cat-bebidas", name: "Bebidas" },
  { id: "cat-almacen", name: "Almacén" },
  { id: "cat-dietetica", name: "Dietética" },
  { id: "cat-panaderia", name: "Panadería" },
  { id: "cat-congelados", name: "Congelados" },
  { id: "cat-limpieza", name: "Limpieza" },
  { id: "cat-aseo", name: "Aseo" },
  { id: "cat-bebes", name: "Bebés" },
  { id: "cat-hogar", name: "Hogar" },
  { id: "cat-ferreteria", name: "Ferretería" },
  { id: "cat-3d", name: "Impresión 3D" },
];

console.log("Verifying parseRawItemList...");
const parsed = parseRawItemList(sampleInput);

assert.equal(parsed.length, 16, "Must parse exactly 16 items");
assert.equal(parsed[0].name, "Control");
assert.equal(parsed[0].cantidad, 1);

assert.equal(parsed[1].name, "Extensión");
assert.equal(parsed[1].cantidad, 1);

assert.equal(parsed[2].name, "Cortador pastillas");
assert.equal(parsed[2].cantidad, 1);

assert.equal(parsed[5].name, "Jgos sábanas contul");
assert.equal(parsed[5].cantidad, 2, "Must extract quantity 2 for '2 Jgos sábanas contul'");

assert.equal(parsed[6].name, "Machacador de ajos");
assert.equal(parsed[6].cantidad, 1);

assert.equal(parsed[8].name, "Gavetero de 4 gavetas");
assert.equal(parsed[8].cantidad, 1, "Must preserve '4 gavetas' in name and default to quantity 1");

assert.equal(parsed[9].name, "Soga p tender");
assert.equal(parsed[9].cantidad, 1);

assert.equal(parsed[14].name, "Almohadones grandes");
assert.equal(parsed[14].cantidad, 2, "Must extract quantity 2 for '2 Almohadones grandes'");

assert.equal(parsed[15].name, "Cubo");
assert.equal(parsed[15].cantidad, 1);

// Test different prefix enumeration formats
const variousPrefixes = `
- Manzanas
• Peras
* Plátanos
1. Leche
2) Pan
10: Harina
100 - Huevos
`;
const parsedPrefixes = parseRawItemList(variousPrefixes);
assert.equal(parsedPrefixes.length, 7);
assert.equal(parsedPrefixes[0].name, "Manzanas");
assert.equal(parsedPrefixes[1].name, "Peras");
assert.equal(parsedPrefixes[2].name, "Plátanos");
assert.equal(parsedPrefixes[3].name, "Leche");
assert.equal(parsedPrefixes[4].name, "Pan");
assert.equal(parsedPrefixes[5].name, "Harina");
assert.equal(parsedPrefixes[6].name, "Huevos");

console.log("Verifying parseAndClassifyList...");
const classified = parseAndClassifyList(sampleInput, categories);
assert.equal(classified.length, 16);

assert.equal(classified[0].categoryName, "Hogar", "Control -> Hogar");
assert.equal(classified[1].categoryName, "Ferretería", "Extensión -> Ferretería");
assert.equal(classified[2].categoryName, "Dietética", "Cortador pastillas -> Dietética");
assert.equal(classified[3].categoryName, "Hogar", "Cortina de baño -> Hogar");
assert.equal(classified[4].categoryName, "Hogar", "Mantel p mesa -> Hogar");
assert.equal(classified[5].categoryName, "Hogar", "Jgos sábanas contul -> Hogar");
assert.equal(classified[6].categoryName, "Hogar", "Machacador de ajos -> Hogar");
assert.equal(classified[7].categoryName, "Hogar", "Abridor p latas y botellas -> Hogar");
assert.equal(classified[8].categoryName, "Hogar", "Gavetero de 4 gavetas -> Hogar");
assert.equal(classified[9].categoryName, "Hogar", "Soga p tender -> Hogar");
assert.equal(classified[10].categoryName, "Hogar", "Escurridor de platos -> Hogar");
assert.equal(classified[11].categoryName, "Hogar", "Jarro mediano no esmaltado -> Hogar");
assert.equal(classified[12].categoryName, "Hogar", "Colador -> Hogar");
assert.equal(classified[13].categoryName, "Hogar", "Embudo -> Hogar");
assert.equal(classified[14].categoryName, "Hogar", "Almohadones grandes -> Hogar");
assert.equal(classified[15].categoryName, "Limpieza", "Cubo -> Limpieza");

// Verify supermarket grocery items
assert.equal(classifyItem("Detergente para vajilla", categories).categoryName, "Limpieza");
assert.equal(classifyItem("Shampoo anticaspa", categories).categoryName, "Aseo");
assert.equal(classifyItem("Leche descremada", categories).categoryName, "Lácteos");
assert.equal(classifyItem("Asado de tira", categories).categoryName, "Carnicos");
assert.equal(classifyItem("Filet de merluza", categories).categoryName, "Pescadería");
assert.equal(classifyItem("Coca Cola 2.25L", categories).categoryName, "Bebidas");
assert.equal(classifyItem("Tomate perita", categories).categoryName, "Verdulería");
assert.equal(classifyItem("Arroz largo fino", categories).categoryName, "Almacén");
assert.equal(classifyItem("Medialunas de manteca", categories).categoryName, "Panadería");
assert.equal(classifyItem("Pañales talle G", categories).categoryName, "Bebés");

console.log("All bulk paste parsing and classification checks passed successfully!");
