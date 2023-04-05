import {
    Scene,
    Color,
    PerspectiveCamera,
    WebGLRenderer,
    ACESFilmicToneMapping,
    sRGBEncoding,
    Mesh,
    PMREMGenerator,
    FloatType,
    MeshStandardMaterial,
    BoxGeometry,
    CylinderGeometry,
    Texture,
    Vector2,
    TextureLoader,
    MeshPhysicalMaterial,
    PCFSoftShadowMap,
    PointLight,
} from 'three';
import { mergeBufferGeometries } from 'three-stdlib/utils/BufferGeometryUtils';
import { OrbitControls } from 'three-stdlib/controls/OrbitControls';
import { RGBELoader } from 'three-stdlib/loaders/RGBELoader';
import { createNoise2D } from 'simplex-noise';

const scene = new Scene();
scene.background = new Color('#87ceeb');

const camera = new PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
// camera.position.set(-17, 31, 33);
camera.position.set(0, 0, 50);

const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.outputEncoding = sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

const light = new PointLight(
    new Color('#ffcb8e').convertSRGBToLinear().convertSRGBToLinear(),
    2,
    200
);
light.position.set(10, 20, 10);

light.castShadow = true;
light.shadow.mapSize.width = 512;
light.shadow.mapSize.height = 512;
light.shadow.camera.near = 0.5;
light.shadow.camera.far = 500;

scene.add(light);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.dampingFactor = 0.05;
controls.enableDamping = true;

let envMap: Texture;

const MAX_HEIGHT = 10;
const STONE_HEIGHT = MAX_HEIGHT * 0.8;
const DIRT_HEIGHT = MAX_HEIGHT * 0.7;
const GRASS_HEIGHT = MAX_HEIGHT * 0.5;
const SAND_HEIGHT = MAX_HEIGHT * 0.3;
const DIRT2_HEIGHT = MAX_HEIGHT * 0;

let stoneGeo = new BoxGeometry(0, 0, 0);
let dirtGeo = new BoxGeometry(0, 0, 0);
let dirt2Geo = new BoxGeometry(0, 0, 0);
let sandGeo = new BoxGeometry(0, 0, 0);
let grassGeo = new BoxGeometry(0, 0, 0);

(async function () {
    let pmrem = new PMREMGenerator(renderer);
    let envMapTexture = await new RGBELoader()
        .setDataType(FloatType)
        .loadAsync('assets/envmap.hdr');
    envMap = pmrem.fromEquirectangular(envMapTexture).texture;

    let textures = {
        dirt: await new TextureLoader().loadAsync('assets/dirt.png'),
        dirt2: await new TextureLoader().loadAsync('assets/dirt2.jpg'),
        grass: await new TextureLoader().loadAsync('assets/grass.jpg'),
        sand: await new TextureLoader().loadAsync('assets/sand.jpg'),
        water: await new TextureLoader().loadAsync('assets/water.jpg'),
        stone: await new TextureLoader().loadAsync('assets/stone.png'),
    };

    const noise2D = createNoise2D();

    for (let i = -15; i <= 15; i++) {
        for (let j = -15; j <= 15; j++) {
            let position = tileToPosition(i, j);

            if (position.length() > 16) continue;

            let noise = (noise2D(i * 0.1, j * 0.1) + 1) * 0.5;
            noise = Math.pow(noise, 1.5);

            makeHex(noise * MAX_HEIGHT, position);
        }
    }

    let stoneMesh = hexMesh(stoneGeo, textures.stone);
    let grassMesh = hexMesh(grassGeo, textures.grass);
    let dirt2Mesh = hexMesh(dirt2Geo, textures.dirt2);
    let dirtMesh = hexMesh(dirtGeo, textures.dirt);
    let sandMesh = hexMesh(sandGeo, textures.sand);

    scene.add(stoneMesh, dirtMesh, dirt2Mesh, sandMesh, grassMesh);

    renderer.setAnimationLoop(() => {
        controls.update();
        renderer.render(scene, camera);
    });
})();

function tileToPosition(tileX, tileY): Vector2 {
    return new Vector2((tileX + (tileY % 2) * 0.5) * 1.77, tileY * 1.535);
}

function hexGeometry(height: number, position): CylinderGeometry {
    let geo = new CylinderGeometry(1, 1, height, 6, 1, false);
    geo.translate(position.x, height * 0.5, position.y);

    return geo;
}

function makeHex(height: number, position): void {
    let geo = hexGeometry(height, position);

    if (height > STONE_HEIGHT) {
        stoneGeo = mergeBufferGeometries([geo, stoneGeo]) as any;
    } else if (height > DIRT_HEIGHT) {
        dirtGeo = mergeBufferGeometries([geo, dirtGeo]) as any;
    } else if (height > GRASS_HEIGHT) {
        grassGeo = mergeBufferGeometries([geo, grassGeo]) as any;
    } else if (height > SAND_HEIGHT) {
        sandGeo = mergeBufferGeometries([geo, sandGeo]) as any;
    } else if (height > DIRT2_HEIGHT) {
        dirt2Geo = mergeBufferGeometries([geo, dirt2Geo]) as any;
    }
}

function hexMesh(geo, map): Mesh {
    let mat = new MeshPhysicalMaterial({
        envMap,
        envMapIntensity: 0.135,
        flatShading: true,
        map,
    });
    let mesh = new Mesh(geo, mat);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}
