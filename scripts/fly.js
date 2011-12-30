elation.component.add('space.fly', {
  usewebgl: true,
  lights: {},
  materials: {},
  objects: {},

  init: function() {
    this.viewsize = this.getsize();

    //this.camera = new THREE.FlyCamera({fov: 50, aspect: this.viewsize[0] / this.viewsize[1], movementSpeed: 200, domElement: this.container, near: 1, far: 1e4, rollSpeed: Math.PI / 6, dragToLook: true});

    this.scene = this.args.scene || new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xCCE8FF, 0.000008);

    this.camera = new THREE.PerspectiveCamera(50, this.viewsize[0] / this.viewsize[1], 20, 5.5e15);
    //this.camera = new THREE.OrthographicCamera(this.viewsize[0] / -2, this.viewsize[0] / 2, this.viewsize[1] / -2, this.viewsize[1] / 2, 0, 5000);
    this.camera.position.z = 500;
    this.scene.add(this.camera);

    elation.ui.hud.init();
    
    this.scene.add(this.camera);

    // TODO - light should just be a property of the sun...
    this.lights['white'] = new THREE.SpotLight( 0xffffff, 1, 50000);
    this.lights['white'].position.x = -10000;
    this.lights['white'].position.y = 10000;
    this.lights['white'].position.z = 10000;
    this.lights['white'].castShadow = true;
    this.scene.add(this.lights['white']);

    //this.createSky(true);

    this.lights['ambient'] = new THREE.AmbientLight( 0x888888 );
    //this.scene.add(this.lights['ambient']);

    this.initRenderer(); 
    this.initControls();

    this.addObjects(this.args.sector, this.scene);

    if (this.container) {
      this.container.appendChild(this.renderer.domElement);
    } else {
      document.body.appendChild(this.renderer.domElement);
    }
    this.stats = new Stats();
    this.stats.domElement.style.position = 'fixed';
    this.stats.domElement.style.top = '0px';
    this.stats.domElement.style.left = '0px';
    this.stats.domElement.style.zIndex = 100;
    this.container.appendChild( this.stats.domElement );

    this.projector = new THREE.Projector();
    this.mouse = [0,0];
    elation.events.add(this.container, 'mousemove', this);

    this.lastupdate = new Date().getTime();
    this.loop();
    if (elation.utils.physics) {
      setTimeout(function() { 
        elation.utils.physics.system.start();

        elation.ui.hud.console.log('ready.');
        elation.ui.hud.radar.nextTarget();
      }, 500);
    }
    
    elation.ui.hud.console.log('initializing, please wait...');
    this.createAdminTool();
  },
  initControls: function() {
    this.controlsenabled = true;
    /*
    this.controls = new THREE.TrackballControls( this.camera, this.renderer.domElement );
    this.controls.rotateSpeed = -1.0;
    this.controls.zoomSpeed = 4;
    this.controls.panSpeed = 3;

    this.controls.noZoom = false;
    this.controls.noPan = false;

    this.controls.staticMoving = true;
    this.controls.dynamicDampingFactor = 0.3;
    this.controls.keys = [ 65, 83, 68 ];
    */
    this.controls = elation.space.controls(0, this.renderer.domElement);

    // TODO - define some top-level bindings for accessing menus, etc
    //this.controls.addContext("default", {}});
    //this.controls.addBindings("default", {});
    //this.controls.activateContext("default", this);
  },
  initRenderer: function() {
    this.renderer = (this.usewebgl ? new THREE.WebGLRenderer({antialias: true, maxShadows: 10}) : new THREE.CanvasRenderer());
    this.renderer.setSize(this.viewsize[0], this.viewsize[1]);

    this.renderer.shadowCameraNear = this.camera.near;
    this.renderer.shadowCameraFar = this.camera.far;
    this.renderer.shadowCameraFov = this.camera.fov;
 
    //this.renderer.shadowMapBias = 0.0039;
    //this.renderer.shadowMapDarkness = 0.5;
    this.renderer.shadowMapWidth = 8192;
    this.renderer.shadowMapHeight = 8192;
 
    this.renderer.shadowMapEnabled = false;
    this.renderer.shadowMapSoft = true;

    this.renderer.autoClear = false;
  },
  getsize: function() {
    if (this.container) {
      this.container.style.height = window.innerHeight + 'px';
      return [this.container.offsetWidth, this.container.offsetHeight];
    }
    return [window.innerWidth, window.innerHeight];
  },
  loop: function() {
    (function(self) {
      requestAnimationFrame( function() { self.loop(); } );
    })(this);
  
    var newsize = this.getsize();
    var ts = new Date().getTime();
    
    this.lastupdatedelta = (ts - this.lastupdate) / 1000;
    
    elation.events.fire('renderframe_start', this);
    
    if (this.controls && this.controlsenabled) {
      this.controls.update();
    }
    if (this.camera) {
      if (this.viewsize[0] != newsize[0] || this.viewsize[1] != newsize[1]) {
        this.viewsize = newsize;
        this.renderer.setSize(this.viewsize[0], this.viewsize[1]);
        this.camera.aspect = this.viewsize[0] / this.viewsize[1];
        this.camera.updateProjectionMatrix();
      }
/*
      var vector = new THREE.Vector3( this.mouse[0], -this.mouse[1], 0.5 );
      this.projector.unprojectVector( vector, this.camera );

      var ray = new THREE.Ray( this.camera.position, vector.subSelf( this.camera.position ).normalize() );

      var c = THREE.Collisions.rayCastNearest( ray );
      if( c ) {
        var poi = ray.origin.clone().addSelf( ray.direction.clone().multiplyScalar(c.distance) );
        //console.log("Found @ normal", c, poi);
      }
*/
      if (elation.utils.physics) {
        elation.utils.physics.system.iterate(this.lastupdatedelta);
      }

      var camera = this.camera;
      if (elation.space.meshes.terrain2) {
        THREE.SceneUtils.traverseHierarchy( this.scene, function ( node ) { if ( node instanceof elation.space.meshes.terrain2 ) node.updateViewport( camera ) } );
      }

      this.renderer.clear();
      if (this.sky) {
        if (this.skyscene) {
          this.skycamera.rotation = this.camera.rotation;
          this.skycamera.quaternion = this.camera.quaternion;
          this.skycamera.useQuaternion = this.camera.useQuaternion;
          var shadowmap = this.renderer.shadowMapEnabled;
          if (shadowmap)
            this.renderer.shadowMapEnabled = false;
          this.renderer.render(this.skyscene, this.skycamera);
          if (shadowmap)
            this.renderer.shadowMapEnabled = true;
        } else {
          this.sky.position = this.camera.position;
        }
      }
      this.renderer.render(this.scene, this.camera);
      this.lastupdate = ts;
    }
    
    elation.events.fire('renderframe_end', this);

    this.stats.update();
  },
  addObjects: function(thing, root) {
    var currentobj = false;
    if (typeof elation.space.meshes[thing.type] == 'function') {
      currentobj = new elation.space.meshes[thing.type](thing);
      if (currentobj.properties && currentobj.properties.physical && currentobj.properties.physical.exists !== 0) {
        root.add(currentobj);

        console.log("Added new " + thing.type + ": " + thing.parentname + '/' + thing.name, currentobj);
        if (thing.things) {
          for (var k in thing.things) {
            this.addObjects(thing.things[k], currentobj);
          }
        }
      }
    } else {
      console.log("don't know how to handle thing type '" + thing.type + "'", thing);
    }
  },
  attachCameraToObject: function(thing) {
    //this.camera = this.followcamera;
    //this.controlsenabled = false;
    if (thing instanceof THREE.Camera) {
      this.oldcamera = this.camera;
      this.camera = thing;
    } else if (thing) {
      this.camera.position = thing.position;
      this.camera.rotation = thing.rotation;
      this.camera.quaternion = thing.quaternion;
      this.camera.useTarget = false;
      this.camera.useQuaternion = true;
    } else {
      if (this.oldcamera) {
        this.camera = this.oldcamera;
      }
    }
  },
  mousemove: function(ev) {
    this.mouse[0] = ( ev.clientX / this.viewsize[0] ) * 2 - 1;
    this.mouse[1] = ( ev.clientY / this.viewsize[1] ) * 2 - 1;
  },
  createSky: function(useskybox, path, format) {
    //var path = "/media/space/textures/skybox/";
    if (!format) {
      format = 'jpg';
    }
    var urls = [
        path + 'px' + '.' + format, path + 'nx' + '.' + format,
        path + 'py' + '.' + format, path + 'ny' + '.' + format,
        path + 'nz' + '.' + format, path + 'pz' + '.' + format
      ];

    this.textureCube = THREE.ImageUtils.loadTextureCube( urls );

    if (useskybox) {
      var shader = THREE.ShaderUtils.lib[ "cube" ];
      shader.uniforms[ "tCube" ].texture = this.textureCube;

      var material = new THREE.ShaderMaterial( {

        fragmentShader: shader.fragmentShader,
        vertexShader: shader.vertexShader,
        uniforms: shader.uniforms,
        depthWrite: false

      } );

      this.sky = new THREE.Mesh( new THREE.CubeGeometry( 30000, 30000, 30000 ), material);
      this.sky.flipSided = true;
      this.skyscene = new THREE.Scene();
      this.skyscene.add(this.sky);
      this.skycamera = new THREE.PerspectiveCamera(50, this.viewsize[0] / this.viewsize[1], 1, 55000);
      this.skyscene.add(this.skycamera);
    } else {
      this.sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 10), new THREE.MeshBasicMaterial({ color: 0xB0E2FF}));
      this.sky.flipSided = true;
      this.scene.add(this.sky);
    }
  },
  
  createAdminTool: function() {
    var div = elation.html.create({tag: 'div', classname: "space_world_admin"});
    var component = elation.space.admin("admin", div);
    this.container.appendChild(div);
  }
});
/* Placeholder for simple universe mesh */
elation.extend("space.meshes.universe", function() {
});
elation.space.meshes.universe.prototype = new elation.space.thing;
