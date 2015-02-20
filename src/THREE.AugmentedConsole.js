( function() {

	var _oldConsole = console.log;

	var supportedTypes = [];

	function addSupportedType( type, format ) {

		supportedTypes.push( {
			type: type,
			format: format
		} );

	}

	addSupportedType( THREE.Matrix4, function( v ) {

		var e = v.elements;
				
		return [
			[ e[ 0 ], e[ 4 ], e[ 8 ], e[ 12 ] ],
			[ e[ 1 ], e[ 5 ], e[ 9 ], e[ 13 ] ],
			[ e[ 2 ], e[ 6 ], e[ 10 ], e[ 14 ] ],
			[ e[ 3 ], e[ 7 ], e[ 11 ], e[ 15 ] ]
		];

	} );

	addSupportedType( THREE.Matrix3, function( v ) {

		var e = v.elements;
				
		return [
			[ e[ 0 ], e[ 3 ], e[ 6 ] ],
			[ e[ 1 ], e[ 4 ], e[ 7 ] ],
			[ e[ 2 ], e[ 5 ], e[ 8 ] ]
		];

	} );

	addSupportedType( THREE.Vector2, function( v ) {

		return {
			Vector2: { x: v.x, y: v.y }
		};

	} );

	addSupportedType( THREE.Vector3, function( v ) {

		return {
			Vector3: { x: v.x, y: v.y, z: v.z }
		};

	} );

	addSupportedType( THREE.Vector4, function( v ) {

		return {
			Vector4: { x: v.x, y: v.y, z: v.z, w: v.w }
		};

	} );

	addSupportedType( THREE.Euler, function( v ) {

		return {
			Vector4: { x: v.x, y: v.y, z: v.z, order: v.order }
		};

	} );

	addSupportedType( THREE.Ray, function( v ) {

		return { 
			'Ray origin': { x: v.origin.x, y: v.origin.y, z: v.origin.z },
			'Ray direction': { x: v.direction.x, y: v.direction.y, z: v.direction.z }
		};

	} );

	function stacktrace() { 
		var err = new Error();
		return err.stack;
	}

	// Code from https://github.com/adriancooney/console.image

	function getBox(width, height) {
		return {
			string: "+",
			style: "font-size: 1px; padding: " + Math.floor(height/2) + "px " + Math.floor(width/2) + "px; line-height: " + height + "px;"
		}
	}

	function logImage(url, scale) {
		scale = scale || 1;
		var img = new Image();

		img.onload = function() {
			var dim = getBox(this.width * scale, this.height * scale);
			console.log("%c" + dim.string, dim.style + "background: url(" + url + "); background-size: " + (this.width * scale) + "px " + (this.height * scale) + "px; color: transparent;");
		};

		img.src = url;

		
	};

	var renderer = new THREE.WebGLRenderer( { 'preserveDrawingBuffer': true, 'antialias': true } );
	renderer.setSize( 256, 256 );
	renderer.setClearColor( 0xffffff );
	renderer.domElement.style.zIndex = 100;

	var scene = new THREE.Scene();
	var camera = new THREE.PerspectiveCamera( 75, renderer.domElement.width / renderer.domElement.height, 1, 100 );
	camera.position.set( 0, 40, 40 );
	var mesh = new THREE.Mesh( new THREE.IcosahedronGeometry( 25, 3 ), new THREE.MeshNormalMaterial() );
	mesh.castShadow = true;
	mesh.receiveShadow = false;
	scene.add( mesh );
	camera.lookAt( mesh.position );

	var ground = new THREE.Mesh( new THREE.PlaneGeometry( 1000, 1000 ), new THREE.MeshBasicMaterial( { color: 0xffffff, side: THREE.DoubleSide } ) );
	ground.rotation.x = - .5 * Math.PI;
	ground.position.y = - 10;
	ground.castShadow = false;
	ground.receiveShadow = true;
	scene.add( ground );

	var ambient = new THREE.AmbientLight( 0x444444 );
	scene.add( ambient );

	light = new THREE.SpotLight( 0xffffff, 1, 0, Math.PI / 2, 1 );
	light.position.set( 1000, 1500, 100 );
	light.target.position.set( 0, 0, 0 );

	light.castShadow = true;

	light.shadowCameraNear = 1200;
	light.shadowCameraFar = 2500;
	light.shadowCameraFov = 20;

	//light.shadowCameraVisible = true;

	light.shadowBias = 0.0001;
	light.shadowDarkness = 0.5;

	light.shadowMapWidth = 1024;
	light.shadowMapHeight = 1024;

	scene.add( light ); 

	renderer.shadowMapEnabled = true;
	renderer.shadowMapType = THREE.PCFShadowMap;

	logImage( 'https://raw.githubusercontent.com/spite/ccapture.js/master/assets/sample.gif' );
	
	console.log = function() {

		//console.trace ();

		var special = false,
			material = false;

		[].forEach.call( arguments, function( a ) { 
			supportedTypes.forEach( function( t ) {
				if( a instanceof t.type ) special = true;
				if( a instanceof THREE.Material ) material = true;
			} );
		} );

		if( special ) {

			[].forEach.call( arguments, function( a ) { 
			
				_oldConsole.apply( console, [ a ] );

				supportedTypes.forEach( function( t ) {

					if( a instanceof t.type ) {

						console.table( t.format( a ) );

					}
					
				} );

			} );

		} else if( material ) {

			[].forEach.call( arguments, function( a ) { 
			
				_oldConsole.apply( console, [ a ] );
				
				if( a instanceof THREE.Material ) {

					/*console.table( { Material: { side: a.side } } );*/
					mesh.material = a.clone();
					if( a.map ) {
						mesh.material.map = a.map.clone();
						mesh.material.map.needsUpdate = true;
					}
					if( a.normalMap ) {
						mesh.material.normalMap = a.normalMap.clone();
						mesh.material.normalMap.needsUpdate = true;
					}
					if( a.specularMap ) {
						mesh.material.specularMap = a.specularMap.clone();
						mesh.material.specularMap.needsUpdate = true;
					}
					renderer.render( scene, camera );
					logImage( renderer.domElement.toDataURL(), 1 );

				}

			} );

		} else {

			_oldConsole.apply( console, arguments );

		}

	}

} )();