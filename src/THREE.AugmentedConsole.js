const methods = [ 'log', 'info', 'debug' ];
const originals = {};
const handlers = [];

// test tells if a value is of the type, show is called with the value after it is logged.
// The handlers added last go first, and one that returns true lets the next one show the value too
function addHandler( test, show ) {

	handlers.unshift( { test, show } );

}

// format returns what console.table shows for a value of the type
function addSupportedType( test, format ) {

	addHandler( test, value => console.table( format( value ) ) );

}

const isObject = v => v !== null && typeof v === 'object';
const isNumber = v => typeof v === 'number';
const isVector3 = v => isObject( v ) && v.isVector3 === true;
const isRay = v => v.isRay === true || ( isVector3( v.origin ) && isVector3( v.direction ) );

// the properties of an object that it has, with their names
const pick = ( v, keys ) => Object.fromEntries( keys.split( ' ' ).filter( k => v[ k ] !== undefined ).map( k => [ k, v[ k ] ] ) );
const xyz = v => pick( v, 'x y z' );
const hexOf = v => '#' + v.getHexString();
const labelOf = o => o.name ? o.type + ' "' + o.name + '"' : o.type;
const logRow = ( name, row ) => console.table( { [ name ]: row } );

// the first of a list of tests that a value passes
function match( list, value ) {

	return list.find( function ( item ) {

		try {

			return item.test( value );

		} catch ( e ) {

			return false;

		}

	} ) || null;

}

function layersOf( mask ) {

	const enabled = [];
	for ( let j = 0; j < 32; j ++ ) if ( mask & ( 1 << j ) ) enabled.push( j );
	return enabled.join( ', ' );

}

// the names of the constants of three.js, which are numbers
const names = {
	wrap: { 1000: 'Repeat', 1001: 'ClampToEdge', 1002: 'MirroredRepeat' },
	filter: { 1003: 'Nearest', 1004: 'NearestMipmapNearest', 1005: 'NearestMipmapLinear', 1006: 'Linear', 1007: 'LinearMipmapNearest', 1008: 'LinearMipmapLinear' },
	type: { 1009: 'UnsignedByte', 1010: 'Byte', 1011: 'Short', 1012: 'UnsignedShort', 1013: 'Int', 1014: 'UnsignedInt', 1015: 'Float', 1016: 'HalfFloat', 1017: 'UnsignedShort4444', 1018: 'UnsignedShort5551', 1020: 'UnsignedInt248' },
	format: { 1021: 'Alpha', 1022: 'RGB', 1023: 'RGBA', 1026: 'Depth', 1027: 'DepthStencil', 1028: 'Red', 1029: 'RedInteger', 1030: 'RG', 1031: 'RGInteger', 1033: 'RGBAInteger' },
	side: [ 'Front', 'Back', 'Double' ],
	blending: [ 'No', 'Normal', 'Additive', 'Subtractive', 'Multiply', 'Custom' ],
	toneMapping: [ 'No', 'Linear', 'Reinhard', 'Cineon', 'ACESFilmic', 'Custom', 'AgX', 'Neutral' ]
};

const nameOf = ( kind, value ) => names[ kind ][ value ] || value;

// ---- colors and pictures

// a swatch for each color, and a text after them
function logSwatches( colors, text = '' ) {

	if ( colors.length === 0 ) return;

	console.log( colors.map( () => '%c  %c ' ).join( '' ) + text, ...colors.flatMap( c => [ 'border: 1px solid #888; border-radius: 3px; padding: 6px 14px; background-color: ' + hexOf( c ) + ';', '' ] ) );

}

// logs pictures in a line, the way of https://github.com/adriancooney/console.image
function logImages( pictures ) {

	pictures = pictures.filter( p => p !== null );

	if ( pictures.length === 0 ) return;

	// the padding alone gives each one the size of its picture
	console.log( pictures.map( () => '%c+' ).join( '%c ' ), ...pictures.flatMap( ( p, j ) => ( j === 0 ? [] : [ '' ] ).concat( 'font-size: 1px; line-height: 1px; padding: ' + Math.floor( p.height / 2 ) + 'px ' + Math.floor( p.width / 2 ) + 'px; ' +
		'background: url(' + p.url + ') no-repeat; background-size: ' + p.width + 'px ' + p.height + 'px; color: transparent;' ) ) );

}

const sizeOf = image => ( { width: image.videoWidth || image.naturalWidth || image.width, height: image.videoHeight || image.naturalHeight || image.height } );

// a picture of an image, a canvas, a video or { data, width, height } with RGBA in bytes or in floats, not bigger than max
function pictureOf( source, max = 256 ) {

	if ( ! isObject( source ) || typeof document === 'undefined' ) return null;

	const { width, height } = sizeOf( source );

	if ( ! ( width > 0 && height > 0 ) ) return null;

	const scale = Math.min( 1, max / Math.max( width, height ) );
	const canvas = document.createElement( 'canvas' );
	canvas.width = Math.max( 1, Math.round( width * scale ) );
	canvas.height = Math.max( 1, Math.round( height * scale ) );

	const ctx = canvas.getContext( '2d' );
	let image = source;

	if ( source.data !== undefined ) {

		const data = source.data;

		if ( ! ArrayBuffer.isView( data ) || data.length < width * height * 4 || ! ( data instanceof Uint8Array || data instanceof Uint8ClampedArray || data instanceof Float32Array ) ) return null;

		const pixels = new ImageData( width, height );
		const k = data instanceof Float32Array ? 255 : 1;

		for ( let j = 0; j < pixels.data.length; j ++ ) pixels.data[ j ] = data[ j ] * k;

		image = document.createElement( 'canvas' );
		image.width = width;
		image.height = height;
		image.getContext( '2d' ).putImageData( pixels, 0, 0 );

		// the first row of the data is the bottom of the picture
		ctx.translate( 0, canvas.height );
		ctx.scale( 1, - 1 );

	}

	try {

		ctx.drawImage( image, 0, 0, canvas.width, canvas.height );
		return { url: canvas.toDataURL(), width: canvas.width, height: canvas.height };

	} catch ( e ) {

		return null;

	}

}

// ---- math

// the types that fit in a row. They are told by the flags that three.js sets, or by their shape, so any copy of three.js works.
// The ones made of vectors have a row for each when they are alone, and a single row in a list
const types = [
	{ name: 'Vector2', test: v => v.isVector2 === true, row: v => pick( v, 'x y' ) },
	{ name: 'Vector3', test: v => v.isVector3 === true, row: xyz },
	{ name: 'Vector4', test: v => v.isVector4 === true, row: v => pick( v, 'x y z w' ) },
	{ name: 'Quaternion', test: v => v.isQuaternion === true, row: v => pick( v, 'x y z w' ) },
	{ name: 'Euler', test: v => v.isEuler === true, row: v => pick( v, 'x y z order' ) },
	{ name: 'Color', test: v => v.isColor === true, row: v => ( { r: v.r, g: v.g, b: v.b, hex: hexOf( v ) } ) },
	{ name: 'Plane', test: v => v.isPlane === true, row: v => ( { ...xyz( v.normal ), constant: v.constant } ) },
	{ name: 'Sphere', test: v => v.isSphere === true || ( isVector3( v.center ) && isNumber( v.radius ) ), row: v => ( { ...xyz( v.center ), radius: v.radius } ) },
	{ name: 'Spherical', test: v => isNumber( v.phi ) && isNumber( v.theta ) && typeof v.makeSafe === 'function', row: v => pick( v, 'radius phi theta' ) },
	{ name: 'Cylindrical', test: v => isNumber( v.radius ) && isNumber( v.theta ) && isNumber( v.y ) && typeof v.setFromCartesianCoords === 'function', row: v => pick( v, 'radius theta y' ) },
	{ name: 'Layers', test: v => isNumber( v.mask ) && typeof v.enable === 'function', row: v => ( { mask: v.mask >>> 0, enabled: layersOf( v.mask ) } ) },
	{ name: 'Ray', test: isRay, parts: 'origin direction' },
	{ name: 'Box3', test: v => v.isBox3 === true, parts: 'min max' },
	{ name: 'Box2', test: v => v.isBox2 === true, parts: 'min max' },
	{ name: 'Line3', test: v => isVector3( v.start ) && isVector3( v.end ), parts: 'start end' },
	{ name: 'Triangle', test: v => isVector3( v.a ) && isVector3( v.b ) && isVector3( v.c ), parts: 'a b c' },
	// what a Raycaster returns, which only comes in lists
	{ name: 'Intersection', listOnly: true, test: v => isNumber( v.distance ) && isVector3( v.point ) && isObject( v.object ), row: v => ( { distance: v.distance, object: v.object.name || v.object.type || '', ...xyz( v.point ), faceIndex: v.faceIndex } ) }
];

const typeOf = value => isObject( value ) ? match( types, value ) : null;
const partsOf = ( type, v ) => type.parts.split( ' ' ).map( part => [ part, xyz( v[ part ] ) ] );

// one row for a value, with the parts side by side
function rowOf( type, v ) {

	if ( ! type.parts ) return type.row( v );

	return Object.fromEntries( partsOf( type, v ).flatMap( ( [ part, row ] ) => Object.entries( row ).map( ( [ key, value ] ) => [ part + '.' + key, value ] ) ) );

}

// a list of things of the same type is a table with a row for each
function listTypeOf( v ) {

	if ( ! Array.isArray( v ) || v.length === 0 || v.length > 10000 ) return null;

	const type = typeOf( v[ 0 ] );

	return type !== null && v.every( item => typeOf( item ) === type ) ? type : null;

}

function showList( v, type = listTypeOf( v ) ) {

	if ( type.name === 'Color' && v.length <= 64 ) logSwatches( v );

	console.table( v.map( item => rowOf( type, item ) ) );

}

addHandler( v => listTypeOf( v ) !== null, v => showList( v ) );

addHandler( v => { const type = typeOf( v ); return type !== null && ! type.listOnly; }, function ( v ) {

	const type = typeOf( v );

	if ( type.name === 'Color' ) logSwatches( [ v ], hexOf( v ) );

	console.table( type.parts ? Object.fromEntries( partsOf( type, v ).map( ( [ part, row ] ) => [ type.name + ' ' + part, row ] ) ) : { [ type.name ]: type.row( v ) } );

} );

const planeRow = types.find( t => t.name === 'Plane' ).row;

addSupportedType( v => Array.isArray( v.planes ) && v.planes.length === 6 && v.planes.every( p => isObject( p ) && p.isPlane === true ), function ( v ) {

	return Object.fromEntries( [ 'right', 'left', 'bottom', 'top', 'far', 'near' ].map( ( name, j ) => [ 'Frustum ' + name, planeRow( v.planes[ j ] ) ] ) );

} );

addSupportedType( v => v.isSphericalHarmonics3 === true, v => v.coefficients.map( xyz ) );

// the matrices, with the rows as rows
addSupportedType( v => v.isMatrix2 === true || v.isMatrix3 === true || v.isMatrix4 === true, function ( v ) {

	const n = Math.sqrt( v.elements.length );

	return Array.from( { length: n }, ( _, row ) => Array.from( { length: n }, ( _, column ) => v.elements[ column * n + row ] ) );

} );

addHandler( v => isObject( v.ray ) && isRay( v.ray ) && isObject( v.params ), function ( v ) {

	logRow( 'Raycaster', { ...xyz( v.ray.origin ), near: v.near, far: v.far, 'line threshold': v.params.Line && v.params.Line.threshold, 'points threshold': v.params.Points && v.params.Points.threshold } );
	logRow( 'Raycaster direction', xyz( v.ray.direction ) );

} );

// a curve, as some points along it
addHandler( v => typeof v.getPoint === 'function' && typeof v.getPoints === 'function' && isNumber( v.arcLengthDivisions ), function ( v ) {

	const points = v.getPoints( 10 );

	logRow( v.type || 'Curve', { ...pick( v, 'closed autoClose curveType tension' ), ...( Array.isArray( v.points ) && { 'control points': v.points.length } ), ...( Array.isArray( v.curves ) && { curves: v.curves.length } ), ...( Array.isArray( v.holes ) && { holes: v.holes.length } ) } );

	if ( listTypeOf( points ) !== null ) showList( points );

} );

// ---- the objects of a scene

// what is worth knowing of an object, by what it is
function describeObject( o ) {

	const info = { ...pick( o, 'name visible' ), children: o.children.length };

	if ( o.parent ) info.parent = labelOf( o.parent );
	if ( o.layers && o.layers.mask !== 1 ) info.layers = layersOf( o.layers.mask );

	if ( o.geometry && o.geometry.isBufferGeometry ) {

		const position = o.geometry.attributes.position;
		info.geometry = o.geometry.type;
		if ( position ) info.vertices = position.count;

	}

	if ( o.material ) info.material = Array.isArray( o.material ) ? o.material.length + ' materials' : o.material.type;
	if ( o.isInstancedMesh ) info.instances = o.count;
	if ( o.isMesh ) Object.assign( info, pick( o, 'castShadow receiveShadow' ) );
	if ( o.isSkinnedMesh && o.skeleton ) info.bones = o.skeleton.bones.length;

	if ( o.isCamera ) Object.assign( info, pick( o, 'fov aspect left right top bottom near far zoom' ) );

	if ( o.isLight ) {

		for ( const key of [ 'color', 'groundColor' ] ) if ( isObject( o[ key ] ) && o[ key ].isColor ) info[ key ] = hexOf( o[ key ] );

		Object.assign( info, pick( o, 'intensity distance decay angle penumbra width height' ) );

		if ( o.shadow ) {

			info.castShadow = o.castShadow;

			if ( o.castShadow ) Object.assign( info, { shadowMap: o.shadow.mapSize.x + ' x ' + o.shadow.mapSize.y }, pick( o.shadow, 'bias normalBias radius' ) );

		}

	}

	if ( o.isScene ) {

		if ( o.background ) info.background = o.background.isColor ? hexOf( o.background ) : o.background.type || 'Texture';
		if ( o.environment ) info.environment = true;
		if ( o.fog ) info.fog = o.fog.isFogExp2 ? 'FogExp2' : 'Fog';

	}

	return info;

}

// the objects under one, folded
function logChildren( object, budget ) {

	for ( const child of object.children ) {

		if ( budget.left -- <= 0 ) return;

		if ( child.children.length > 0 ) {

			console.groupCollapsed( labelOf( child ) + ' (' + child.children.length + ')' );
			logChildren( child, budget );
			console.groupEnd();

		} else {

			console.log( labelOf( child ) );

		}

	}

}

addHandler( v => v.isObject3D === true, function ( o ) {

	const e = o.matrixWorld.elements;

	if ( o.isLight && isObject( o.color ) && o.color.isColor ) logSwatches( [ o.color ], hexOf( o.color ) );

	logRow( o.type, describeObject( o ) );

	// the world position is the one of the last time that the matrices were updated
	console.table( {
		position: xyz( o.position ),
		rotation: pick( o.rotation, 'x y z order' ),
		scale: xyz( o.scale ),
		'world position': { x: e[ 12 ], y: e[ 13 ], z: e[ 14 ] }
	} );

	if ( o.children.length > 0 ) {

		const budget = { left: 500 };

		console.groupCollapsed( 'children (' + o.children.length + ')' );
		logChildren( o, budget );
		if ( budget.left < 0 ) console.log( '...' );
		console.groupEnd();

	}

} );

addHandler( v => v.isFog === true || v.isFogExp2 === true, function ( v ) {

	logSwatches( [ v.color ], hexOf( v.color ) );
	logRow( v.isFog ? 'Fog' : 'FogExp2', { color: hexOf( v.color ), ...pick( v, 'near far density' ) } );

} );

const arrayType = attribute => attribute.array ? attribute.array.constructor.name : attribute.data && attribute.data.array ? attribute.data.array.constructor.name + ', interleaved' : '';
const attributeRow = a => ( { ...pick( a, 'itemSize count' ), type: arrayType( a ), normalized: a.normalized } );

addHandler( v => v.isBufferGeometry === true, function ( g ) {

	const position = g.attributes.position;
	const morphs = Object.keys( g.morphAttributes || {} );

	console.table( { ...Object.fromEntries( Object.entries( g.attributes ).map( ( [ name, a ] ) => [ name, attributeRow( a ) ] ) ), ...( g.index && { index: attributeRow( g.index ) } ) } );

	logRow( g.type, {
		vertices: position ? position.count : 0,
		groups: g.groups.length,
		drawRange: g.drawRange.count === Infinity ? 'all' : g.drawRange.start + ' + ' + g.drawRange.count,
		...( g.index && { indices: g.index.count } ),
		...( morphs.length > 0 && { morphAttributes: morphs.join( ', ' ) } ),
		...( g.isInstancedBufferGeometry && { instances: g.instanceCount } ),
		...( g.boundingSphere && { radius: g.boundingSphere.radius } )
	} );

	if ( g.boundingBox ) console.table( { 'boundingBox min': xyz( g.boundingBox.min ), 'boundingBox max': xyz( g.boundingBox.max ) } );

} );

// the first items of an attribute, one in each row
addHandler( v => v.isBufferAttribute === true || v.isInterleavedBufferAttribute === true, function ( a ) {

	const shown = Math.min( a.count, 20 );
	const getters = a.itemSize <= 4 ? [ 'X', 'Y', 'Z', 'W' ].slice( 0, a.itemSize ) : null;

	console.log( a.count + ' items of ' + a.itemSize + ', ' + arrayType( a ) + ( a.normalized ? ', normalized' : '' ) + ( shown < a.count ? '. The first ' + shown + ':' : ':' ) );

	console.table( Array.from( { length: shown }, function ( _, j ) {

		if ( getters === null ) return Array.from( a.array.slice( j * a.itemSize, ( j + 1 ) * a.itemSize ) );

		return Object.fromEntries( getters.map( g => [ g.toLowerCase(), a[ 'get' + g ]( j ) ] ) );

	} ) );

} );

const textureRow = t => ( { format: nameOf( 'format', t.format ), type: nameOf( 'type', t.type ), colorSpace: t.colorSpace || 'none' } );

addHandler( v => v.isTexture === true, function ( t ) {

	const images = Array.isArray( t.image ) ? t.image : [ t.image ];
	const first = isObject( images[ 0 ] ) ? images[ 0 ] : {};

	// data that is not RGBA can't be drawn. The faces of a cube are smaller
	if ( first.data === undefined || ( t.format === 1023 && ! ( first.depth > 1 ) ) ) logImages( images.map( image => pictureOf( image, images.length > 1 ? 96 : 256 ) ) );

	logRow( t.isCubeTexture ? 'CubeTexture' : t.isRenderTargetTexture ? 'Texture of a render target' : t.constructor && /Texture/.test( t.constructor.name ) ? t.constructor.name : 'Texture', {
		name: t.name,
		...sizeOf( first ),
		...( first.depth > 1 && { depth: first.depth } ),
		...textureRow( t ),
		wrapS: nameOf( 'wrap', t.wrapS ),
		wrapT: nameOf( 'wrap', t.wrapT ),
		magFilter: nameOf( 'filter', t.magFilter ),
		minFilter: nameOf( 'filter', t.minFilter ),
		mipmaps: t.generateMipmaps,
		...pick( t, 'flipY anisotropy' )
	} );

} );

addHandler( v => v.isRenderTarget === true || v.isWebGLRenderTarget === true, function ( v ) {

	const textures = v.textures || [ v.texture ];

	logRow( v.isWebGLCubeRenderTarget ? 'WebGLCubeRenderTarget' : 'RenderTarget', {
		...pick( v, 'width height' ),
		...( v.depth > 1 && { depth: v.depth } ),
		textures: textures.length,
		...( textures[ 0 ] && textureRow( textures[ 0 ] ) ),
		...pick( v, 'samples depthBuffer stencilBuffer' ),
		depthTexture: !! v.depthTexture
	} );

} );

addHandler( v => v.isWebGLRenderer === true || v.isWebGPURenderer === true || ( isObject( v.info ) && isObject( v.domElement ) && typeof v.render === 'function' ), function ( v ) {

	const { render = {}, memory = {} } = v.info;

	logRow( v.isWebGLRenderer ? 'WebGLRenderer' : 'Renderer', {
		...pick( v.domElement, 'width height' ),
		pixelRatio: typeof v.getPixelRatio === 'function' ? v.getPixelRatio() : undefined,
		outputColorSpace: v.outputColorSpace,
		toneMapping: nameOf( 'toneMapping', v.toneMapping ),
		...pick( v, 'toneMappingExposure' ),
		shadows: !! ( v.shadowMap && v.shadowMap.enabled )
	} );

	// what the last frame took. WebGPURenderer counts the draw calls apart from the calls to render()
	logRow( 'info', { calls: render.drawCalls !== undefined ? render.drawCalls : render.calls, ...pick( render, 'triangles points lines' ), ...pick( memory, 'geometries textures' ), ...( Array.isArray( v.info.programs ) && { programs: v.info.programs.length } ) } );

} );

// ---- materials and uniforms

const isUniforms = v => isObject( v ) && Object.getPrototypeOf( v ) === Object.prototype && Object.keys( v ).length > 0 && Object.values( v ).every( u => isObject( u ) && 'value' in u );

// the type and the value of anything, in a few words
function describeValue( v ) {

	if ( ! isObject( v ) ) return { type: v === null ? 'null' : typeof v, value: v };
	if ( Array.isArray( v ) || ArrayBuffer.isView( v ) ) return { type: v.constructor.name, value: v.length + ' items' };
	if ( v.isTexture ) return { type: 'Texture', value: Object.values( sizeOf( isObject( v.image ) ? v.image : {} ) ).join( ' x ' ) };

	const type = typeOf( v );

	if ( type !== null ) return { type: type.name, value: Object.values( rowOf( type, v ) ).map( n => isNumber( n ) ? Math.round( n * 10000 ) / 10000 : n ).join( ', ' ) };

	return { type: v.isMatrix4 ? 'Matrix4' : v.isMatrix3 ? 'Matrix3' : v.constructor ? v.constructor.name : 'Object', value: '' };

}

function showUniforms( uniforms ) {

	logSwatches( Object.values( uniforms ).map( u => u.value ).filter( v => isObject( v ) && v.isColor === true ) );
	console.table( Object.fromEntries( Object.entries( uniforms ).map( ( [ name, u ] ) => [ name, describeValue( u.value ) ] ) ) );

}

addHandler( isUniforms, showUniforms );

addHandler( v => v.isMaterial === true, function ( m ) {

	// the color of the blending is one that nobody looks for
	const colors = Object.keys( m ).filter( key => key !== 'blendColor' && isObject( m[ key ] ) && m[ key ].isColor === true );
	const maps = Object.keys( m ).filter( key => isObject( m[ key ] ) && m[ key ].isTexture === true );

	logSwatches( colors.map( key => m[ key ] ) );

	logRow( m.type, {
		name: m.name,
		...Object.fromEntries( colors.map( key => [ key, hexOf( m[ key ] ) ] ) ),
		...pick( m, 'opacity transparent alphaTest' ),
		side: nameOf( 'side', m.side ),
		blending: nameOf( 'blending', m.blending ),
		...pick( m, 'depthTest depthWrite roughness metalness shininess clearcoat transmission ior emissiveIntensity envMapIntensity wireframe flatShading vertexColors' ),
		...( maps.length > 0 && { maps: maps.join( ', ' ) } )
	} );

	if ( isUniforms( m.uniforms ) ) showUniforms( m.uniforms );

} );

// ---- animation

addHandler( v => Array.isArray( v.tracks ) && isNumber( v.duration ), function ( v ) {

	logRow( 'AnimationClip', { ...pick( v, 'name duration' ), tracks: v.tracks.length } );
	console.table( v.tracks.slice( 0, 50 ).map( t => ( { name: t.name, type: t.ValueTypeName, keys: t.times.length } ) ) );

} );

addHandler( v => typeof v.clipAction === 'function' && isNumber( v.timeScale ), function ( v ) {

	logRow( 'AnimationMixer', { ...pick( v, 'time timeScale' ), root: labelOf( v.getRoot() ), ...( v.stats && { actions: v.stats.actions.total, 'actions in use': v.stats.actions.inUse } ) } );

} );

addHandler( v => Array.isArray( v.bones ) && Array.isArray( v.boneInverses ), function ( v ) {

	logRow( 'Skeleton', { bones: v.bones.length } );
	console.table( v.bones.slice( 0, 50 ).map( b => ( { name: b.name, parent: b.parent ? b.parent.name || b.parent.type : '', ...xyz( b.position ) } ) ) );

} );

// ---- the console

function augment( original ) {

	return function () {

		// the line is logged as it was, what is added comes after it
		original.apply( console, arguments );

		for ( const a of arguments ) {

			if ( ! isObject( a ) ) continue;

			let from = 0;

			while ( from < handlers.length ) {

				const handler = match( handlers.slice( from ), a );

				if ( handler === null || handler.show( a ) !== true ) break;

				from = handlers.indexOf( handler ) + 1;

			}

		}

	};

}

function install() {

	if ( originals.log !== undefined ) return;

	for ( const method of methods ) {

		originals[ method ] = console[ method ];
		console[ method ] = augment( originals[ method ] );

	}

}

function uninstall() {

	for ( const method of methods ) {

		if ( originals[ method ] !== undefined ) console[ method ] = originals[ method ];
		delete originals[ method ];

	}

}

install();

export { install, uninstall, addSupportedType, addHandler, logImages, pictureOf };
