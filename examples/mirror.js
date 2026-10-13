// Shows in the page what goes to the console: the tables, the lines with styles and the groups.
// It has to be loaded before the library, to be under it.
( function () {

	var log = console.log, table = console.table, group = console.groupCollapsed, groupEnd = console.groupEnd;
	var sink = null, groups = [];

	var style = document.createElement( 'style' );
	style.textContent = '.mirror{ font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.4; }' +
		'.mirror p{ margin: 0 0 8px; }' +
		'.mirror p span{ display: inline-block; vertical-align: middle; white-space: pre; }' +
		'.mirror table{ border-collapse: collapse; margin: 0 0 10px; }' +
		'.mirror th, .mirror td{ border: 1px solid rgba( 128, 128, 128, .5 ); padding: 3px 8px; text-align: left; white-space: nowrap; }' +
		'.mirror th{ font-weight: 400; opacity: .7; }' +
		'.mirror details{ margin: 0 0 8px; } .mirror details > *:not( summary ){ margin-left: 16px; } .mirror summary{ cursor: pointer; }' +
		'.mirror .scroll{ overflow-x: auto; }';
	document.head.appendChild( style );

	function add( element ) {

		( groups.length > 0 ? groups[ groups.length - 1 ] : sink ).appendChild( element );

	}

	function cell( row, tag, value ) {

		row.appendChild( document.createElement( tag ) ).textContent = typeof value === 'number' ? Math.round( value * 10000 ) / 10000 : value === undefined ? '' : value;

	}

	console.log = function ( format ) {

		log.apply( console, arguments );

		// the lines of text, with their styles when they have them
		if ( sink === null || typeof format !== 'string' ) return;

		var line = document.createElement( 'p' );
		var args = arguments;

		format.split( '%c' ).forEach( function ( text, j ) {

			var span = line.appendChild( document.createElement( 'span' ) );
			span.textContent = text;
			if ( j > 0 ) span.style.cssText = args[ j ];

		} );

		add( line );

	};

	console.table = function ( data ) {

		table.apply( console, arguments );

		if ( sink === null ) return;

		var rows = Object.keys( data ), columns = [];

		rows.forEach( function ( row ) {

			Object.keys( data[ row ] ).forEach( function ( key ) {

				if ( columns.indexOf( key ) === - 1 ) columns.push( key );

			} );

		} );

		var element = document.createElement( 'table' );
		var head = element.insertRow();

		[ '(index)' ].concat( columns ).forEach( function ( name ) { cell( head, 'th', name ); } );

		rows.forEach( function ( row ) {

			var tr = element.insertRow();
			cell( tr, 'th', row );
			columns.forEach( function ( key ) { cell( tr, 'td', data[ row ][ key ] ); } );

		} );

		var scroll = document.createElement( 'div' );
		scroll.className = 'scroll';
		scroll.appendChild( element );
		add( scroll );

	};

	console.groupCollapsed = function ( label ) {

		group.apply( console, arguments );

		if ( sink === null ) return;

		var details = document.createElement( 'details' );
		details.appendChild( document.createElement( 'summary' ) ).textContent = label;
		add( details );
		groups.push( details );

	};

	console.groupEnd = function () {

		groupEnd.apply( console, arguments );
		groups.pop();

	};

	// what fn logs is shown in the element. Without fn, everything is, from then on
	window.mirror = function ( element, fn ) {

		element.classList.add( 'mirror' );
		sink = element;
		groups = [];

		if ( fn === undefined ) return;

		try {

			fn();

		} finally {

			sink = null;

		}

	};

} )();
