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

	console.log = function() {

		//console.trace ();

		var special = false;

		[].forEach.call( arguments, function( a ) { 
			supportedTypes.forEach( function( t ) {
				if( a instanceof t.type ) special = true;;
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

		} else {

			_oldConsole.apply( console, arguments );

		}

	}

} )();