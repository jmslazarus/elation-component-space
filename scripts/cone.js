elation.extend("space.meshes.cone", function(args) {
  elation.space.thing.call(this, args);
  this.autocreategeometry = false;
  this.parts = {};

  this.postinit = function() {
console.log(this);
    this.createMesh();
  }
  this.createMesh = function() {
    this.parts['base'] = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 1), new THREE.MeshPhongMaterial({color: 0x222222}));
    this.parts['cone'] = new THREE.Mesh(new THREE.CylinderGeometry(2, 5, 20), new THREE.MeshPhongMaterial({color: 0xff6600}));
    this.parts['cone'].position.y = 10.5;
    this.parts['base'].position.y = -.5;
    this.add(this.parts['base']);
    this.add(this.parts['cone']);
  }
  this.init();
});
elation.space.meshes.cone.prototype = new elation.space.thing();
elation.space.meshes.cone.prototype.constructor = elation.space.meshes.cone;
