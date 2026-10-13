import {
	BackSide,
	CanvasTexture,
	DataUtils,
	DirectionalLight,
	HemisphereLight,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	PMREMGenerator,
	Scene,
	SphereGeometry,
	SRGBColorSpace,
	WebGLRenderer
} from 'three';
import { addHandler, logImages, pictureOf } from './THREE.AugmentedConsole.js';

const SIZE = 256;

let renderer = null;
let scene, camera, mesh;

// the renderer of the page, to read its render targets
let reader = null;

// something to reflect, for the materials that are lit by their environment
function createEnvironment() {

	const canvas = document.createElement( 'canvas' );
	canvas.width = 64;
	canvas.height = 32;

	const ctx = canvas.getContext( '2d' );
	const gradient = ctx.createLinearGradient( 0, 0, 0, 32 );
	gradient.addColorStop( 0, '#ffffff' );
	gradient.addColorStop( .5, '#9a9a9a' );
	gradient.addColorStop( 1, '#3a3a3a' );
	ctx.fillStyle = gradient;
	ctx.fillRect( 0, 0, 64, 32 );
	ctx.fillStyle = '#ffffff';
	ctx.fillRect( 8, 6, 14, 8 );
	ctx.fillRect( 40, 4, 10, 6 );

	const texture = new CanvasTexture( canvas );
	texture.colorSpace = SRGBColorSpace;

	const room = new Scene();
	const sky = new Mesh( new SphereGeometry( 10, 32, 16 ), new MeshBasicMaterial( { map: texture, side: BackSide } ) );
	room.add( sky );

	const pmrem = new PMREMGenerator( renderer );
	const environment = pmrem.fromScene( room ).texture;

	pmrem.dispose();
	texture.dispose();
	sky.geometry.dispose();
	sky.material.dispose();

	return environment;

}

function init() {

	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( 1 );
	renderer.setSize( SIZE, SIZE );
	renderer.setClearColor( 0x777777 );

	scene = new Scene();
	scene.environment = createEnvironment();

	camera = new PerspectiveCamera( 40, 1, .1, 100 );
	camera.position.set( 0, 0, 3.2 );

	mesh = new Mesh( new SphereGeometry( 1, 64, 32 ) );
	scene.add( mesh );

	scene.add( new HemisphereLight( 0xffffff, 0x444444, 1.5 ) );

	const light = new DirectionalLight( 0xffffff, 2.5 );
	light.position.set( 2, 3, 4 );
	scene.add( light );

}

// a picture of a sphere with the material, as a data URL
function renderMaterial( material ) {

	if ( renderer === null ) init();

	// the material itself, as it is at this moment
	mesh.material = material;
	renderer.render( scene, camera );

	return renderer.domElement.toDataURL();

}

// the picture goes first, and what the main module shows comes after it
addHandler( v => v.isMaterial === true, function ( material ) {

	try {

		logImages( [ { url: renderMaterial( material ), width: SIZE, height: SIZE } ] );

	} catch ( e ) {

		console.warn( 'THREE.AugmentedConsole: the material could not be rendered', e );

	}

	return true;

} );

function setRenderer( value ) {

	reader = value;

}

// what a render target has, when it is RGBA and a renderer was given to read it
function renderTargetPicture( target ) {

	const { width, height } = target;
	const type = target.texture.type;

	if ( reader === null || target.isWebGLCubeRenderTarget || target.texture.format !== 1023 || width * height > 2048 * 2048 ) return null;

	// bytes, half floats or floats
	const data = type === 1009 ? new Uint8Array( width * height * 4 ) : type === 1016 ? new Uint16Array( width * height * 4 ) : type === 1015 ? new Float32Array( width * height * 4 ) : null;

	if ( data === null ) return null;

	reader.readRenderTargetPixels( target, 0, 0, width, height, data );

	const values = type === 1016 ? Float32Array.from( data, DataUtils.fromHalfFloat ) : type === 1009 ? Float32Array.from( data, v => v / 255 ) : data;

	// what a render target has is linear, the picture shows it the way the screen would
	if ( target.texture.colorSpace !== SRGBColorSpace ) {

		for ( let j = 0; j < values.length; j ++ ) if ( j % 4 !== 3 ) values[ j ] = Math.pow( Math.max( values[ j ], 0 ), 1 / 2.2 );

	}

	return pictureOf( { data: values, width, height } );

}

addHandler( v => v.isRenderTarget === true || v.isWebGLRenderTarget === true, function ( target ) {

	try {

		logImages( [ renderTargetPicture( target ) ] );

	} catch ( e ) {}

	return true;

} );

function dispose() {

	if ( renderer === null ) return;

	scene.environment.dispose();
	mesh.geometry.dispose();
	renderer.dispose();
	renderer.forceContextLoss();
	renderer = null;

}

export { renderMaterial, setRenderer, dispose };
