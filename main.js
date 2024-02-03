//Visit https://doc.babylonjs.com/setup/frameworkPackages/npmSupport for documentation

import { Inspector } from "@babylonjs/inspector";

import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { ExtrudeShape } from "@babylonjs/core/Meshes/Builders/shapeBuilder";
import { Scene } from "@babylonjs/core/scene";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { ShadowGeneratorSceneComponent } from "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

import { createNoise2D } from 'simplex-noise';
import alea from 'alea';

// Set babylon components up
const canvas = document.getElementById("renderCanvas");
const engine = new Engine(canvas);
var scene = new Scene(engine);
scene.clearColor = new Color3(0, 0, 0);
Inspector.Show(scene, {
  embedMode: true
});

// Generated information
let mapTileScale = 1
let mapLength = 50
let mapWidth = 50
let points = hexagonScatter(mapTileScale, mapLength, mapWidth)
let cameraTarget = new Vector3((mapTileScale * mapLength/2), 0, (mapTileScale * mapWidth/2))
let heightMap = generateHeightMap(points, 7, 0.05, 0.04, 0.25, 10, 1)

// Set camera up
var camera = new ArcRotateCamera("camera", 0, 0, 0, cameraTarget,scene);
camera.position = new Vector3(mapWidth/2, 40, -50)
camera.attachControl(canvas, true);

// Lighting
var envLight = new HemisphericLight("HemiLight", new Vector3(0, 1, 0), scene);
var light = new DirectionalLight("DirectLight", new Vector3(1, -1, 0), scene);
var fill = new DirectionalLight("FillLight", new Vector3(-1, -1, 0), scene);
envLight.intensity = 0.4;
light.intensity = 0.2;
fill.intensity = 0.1;

function hexagonScatter(spacing, worldHeight, worldWidth) {
  let _spacing = spacing;
  let _worldHeight = worldHeight;
  let _worldWidth = worldWidth;

  let pts = [];
  const angle = Math.PI / 3;

  for (let h = 0; h < _worldHeight; h++) {
    let x = ((h % 2) * _spacing) * Math.cos(angle);
    let z = (h * _spacing) * Math.sin(angle);

    for (let w = 0; w < _worldWidth; w++) {
      pts.push(new Vector3(x + (w * _spacing), 0, z));
    }
  }
  return pts;
}

function createTile(size) {
  const sides = 6;
  const angle = (2 * Math.PI) / sides;
  const hexTile = [];

  for (let i = 0; i <= sides; i += 1) {
    let x = size / 2 * Math.cos(i * angle);
    let y = size / 2 * Math.sin(i * angle);
    hexTile.push(new Vector3(x, y, 0));
  }

  return hexTile;
}

function generateHeightMap(points, seed, scale, fuzzyScale, fuzzynessAmplitude, amplitude, minLevel){
  const largeSeed = alea(seed);
  const detailSeed = alea(seed + 1);
  const largeNoise = createNoise2D(largeSeed);
  const detailNoise = createNoise2D(detailSeed);

  let heights = []

  for (let i = 0; i < points.length; i += 1) {
    let noiseX = scale * points[i].x;
    let noiseY = scale * points[i].z;
    let noiseResult = largeNoise(noiseX, noiseY);
    let mappedNoise = mapRange(noiseResult, -1, 1, 0, 1);
    let contrastedNoise = Math.pow(mappedNoise, 2);

    let fuzzyX = fuzzyScale * points[i].x;
    let fuzzyY = fuzzyScale * points[i].z;
    let fuzzyNoise = contrastedNoise + detailNoise(fuzzyX, fuzzyY) * fuzzynessAmplitude;

    let amplitudeAdjustedHeight = fuzzyNoise * amplitude;
    if(amplitudeAdjustedHeight < minLevel) amplitudeAdjustedHeight = minLevel;
    
    heights.push(amplitudeAdjustedHeight);
  }
  return heights;
}

const myPath = [
  new Vector3(0, 0, 0),
  new Vector3(0, 1, 0),
];

const options = {
  shape: createTile(1),
  path: myPath, //vec3 array
  updatable: true,
  cap: Mesh.CAP_ALL
}

let extrusion = ExtrudeShape("ext", options);
extrusion.scaling.y = heightMap[0];
extrusion.convertToFlatShadedMesh();
extrusion.receiveShadows = true;

let shadowGenerator = new ShadowGenerator(1024, light);
shadowGenerator.addShadowCaster(extrusion);

for (let index = 1; index < points.length; index++) {
    let newInstance = extrusion.createInstance("i" + index);
    newInstance.position.x = points[index].x;
    newInstance.position.y = points[index].y;
    newInstance.position.z = points[index].z;

    newInstance.scaling.y = heightMap[index];

    newInstance.rotation.x = 0;
    newInstance.rotation.y = 0;
    newInstance.rotation.z = 0;

    newInstance.convertToFlatShadedMesh;
    shadowGenerator.addShadowCaster(newInstance);
}

// Render every frame
engine.runRenderLoop(() => {
  scene.render();
});

//Resize events
window.addEventListener("resize", function () {
  engine.resize();
});

function mapRange(value, fromLow, fromHigh, toLow, toHigh) {
  return (value - fromLow) * (toHigh - toLow) / (fromHigh - fromLow) + toLow;
}