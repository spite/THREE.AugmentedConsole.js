# THREE.AugmentedConsole.js

THREE.AugmenteConsole.js is a small tool to make development with three.js easier.

It uses chrome's console.table to format the output when using console.log to inspect objects. If the object is a known format it uses a table to display its contents.

The supported types are

* THREE.Vector2, THREE.Vector3, THREE.Vector4
* THREE.Matrix3, THREE.Matrix4
* THREE.Euler
* THREE.Ray

##### Demo

Here's a [demo showing how it works](http://www.clicktorelease.com/tools/augmented-console/)

##### Snapshots
Chrome
![Chrome](http://www.clicktorelease.com/tools/augmented-console/chrome-augmented-console.jpg "The output on Chrome")
Firefox
![Firefox](http://www.clicktorelease.com/tools/augmented-console/firefox-augmented-console.jpg "The output of Firefox")

##### How to use
Include the script file in your three.js project and the console will be automatically augmented

    <script src="THREE.AugmentedConsole.js"></script>

##### Support
Chrome, Firefox, and Safari.

Check more stuff here: [clicktorelease.com](http://www.clicktorelease.com) and [twitter](http://twitter.com/thespite).

License
----

MIT
