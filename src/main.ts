import {
    Scene,
    Color,
    PerspectiveCamera,
    WebGLRenderer,
    ACESFilmicToneMapping,
    sRGBEncoding,
    Mesh,
    SphereGeometry,
    MeshBasicMaterial,
    PMREMGenerator,
    FloatType,
    MeshStandardMaterial,
    BoxGeometry,
    CylinderGeometry,
    Texture,
    Vector2,
} from 'three';
import { mergeBufferGeometries } from 'three-stdlib/utils/BufferGeometryUtils';
import { OrbitControls } from 'three-stdlib/controls/OrbitControls';
import { RGBELoader } from 'three-stdlib/loaders/RGBELoader';

const scene = new Scene();
scene.background = new Color('#ffeecc');

const camera = new PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
// camera.position.set(-17, 31, 33);
camera.position.set(0, 0, 50);

const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.outputEncoding = sRGBEncoding;
renderer.useLegacyLights = true;

document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.dampingFactor = 0.05;
controls.enableDamping = true;

let envMap: Texture;

let hexagonGeometries = new BoxGeometry(0, 0, 0);

(async function () {
    let pmrem = new PMREMGenerator(renderer);
    let envMapTexture = await new RGBELoader()
        .setDataType(FloatType)
        .loadAsync('assets/envmap.hdr');
    envMap = pmrem.fromEquirectangular(envMapTexture).texture;

    for (let i = -10; i <= 10; i++) {
        for (let j = -10; j <= 10; j++) {
            makeHex(3, new Vector2(i, j));
        }
    }

    let hexagonMesh = new Mesh(
        hexagonGeometries,
        new MeshStandardMaterial({
            envMap,
            flatShading: true,
        })
    );
    scene.add(hexagonMesh);

    renderer.setAnimationLoop(() => {
        controls.update();
        renderer.render(scene, camera);
    });
})();

function hexGeometry(height: number, position) {
    let geo = new CylinderGeometry(1, 1, height, 6, 1, false);
    geo.translate(position.x, height * 0.5, position.y);

    return geo;
}

function makeHex(height: number, position) {
    let geo = hexGeometry(height, position);
    hexagonGeometries = mergeBufferGeometries([hexagonGeometries, geo]) as any;
}
