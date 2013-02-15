elation.component.add('space.starbinger', {
  usewebgl: Detector.webgl,
  lights: {},
  materials: {},
  objects_array: [],
  objects: {},
  camerapos: new THREE.Vector3(0,0,0),

  init: function() {
    this.dustCount = 1000;
    this.dustDiameter = 750;
    this.dustRadius = this.dustDiameter / 2;
    this.dustSize = 2;
    
    elation.space.controller = this;
    this.viewsize = this.getsize();

    this.scene = this.args.scene || new THREE.Scene();
    this.sceneCube = new THREE.Scene();
    //this.scene.fog = new THREE.FogExp2(0xCCE8FF, 0.000008);

    this.camera = new THREE.PerspectiveCamera(50, this.viewsize[0] / this.viewsize[1], 3, 1.5e15);
    this.cameraCube = new THREE.PerspectiveCamera(50, this.viewsize[0] / this.viewsize[1], 1, 100);
    elation.events.add(window,'resize',this);
    this.camera.position = this.camerapos;
    this.scene.add(this.camera);
    this.sceneCube.add(this.cameraCube);    
    
    this.initRenderer(); 
    this.initControls();
    
    var HUD = elation.utils.arrayget(this.args, 'sector.properties.render.hud').split(',');
    elation.ui.hud.init(HUD, this);
    
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
      elation.utils.physics.system.setController(this);
      setTimeout(function() { 
        elation.utils.physics.system.start();
        elation.ui.hud.radar.nextTarget();
      }, 500);
    }
    
    //elation.ui.hud.console.log('initializing, please wait...');
    this.createAdminTool();
    elation.space.thing.setController = this;
    
    this.addSkybox();
    this.addDust();
  },
  resize: function(event) {
    this.viewsize = this.getsize();
		this.camera.aspect = this.viewsize[0] / this.viewsize[1];
		this.cameraCube.aspect = this.viewsize[0] / this.viewsize[1];
		this.camera.updateProjectionMatrix();
		this.cameraCube.updateProjectionMatrix();

		this.renderer.setSize( this.viewsize[0], this.viewsize[1] );

    //this.camera = new THREE.PerspectiveCamera(50, this.viewsize[0] / this.viewsize[1], 1, 1.5e15);
    //this.cameraCube = new THREE.PerspectiveCamera(50, this.viewsize[0] / this.viewsize[1], 1, 100);
  },
  addSkybox: function() {
    var texture = THREE.ImageUtils.loadTexture( '/~lazarus/elation/images/space/galaxy_starfield.png');
    texture.repeat.y = 1;
    texture.repeat.x = .5;
    var material = new THREE.MeshBasicMaterial({ map: texture, depthWrite: false });
    var materialArray = material;
    var skyboxGeom = new THREE.CubeGeometry(100, 100, 100);
    
    this.skybox = new THREE.Mesh(skyboxGeom, materialArray);
    this.skybox.flipSided = true;
    this.skybox.position = this.cameraCube.position;
    
    this.sceneCube.add(this.skybox);
    this.renderer.autoClear = false;
    this.cameraCube.useQuaternion = true;
  },
  r: function(min, max) {
    var rand = Math.random(),
        value = (max - min) * rand + min;
    
    return Math.round(value);
  },
  addDust: function() {
    // create the particles
    this.dustParticles = new THREE.Geometry();
    //var hexColor = '0x'+this.r(0,9)+this.r(0,9)+this.r(0,9)+this.r(0,9)+this.r(0,9)+this.r(0,9);
    
    //console.log('HEX COLOR!!@!',hexColor);
    var pMaterial = new THREE.ParticleBasicMaterial({
          color: 0xFFFFFF,
          size: this.dustSize,
          map: THREE.ImageUtils.loadTexture(
            "/~lazarus/elation/images/space/particle_3.png"
          ),
          blending: THREE.AdditiveBlending,
          transparent: true
        });
    
    for (var p = 0; p < this.dustCount; p++) {
      var ppos = new THREE.Vector3(
            this.camera.position.x + Math.random() * this.dustDiameter - this.dustRadius,
            this.camera.position.y + Math.random() * this.dustDiameter - this.dustRadius,
            this.camera.position.z + Math.random() * this.dustDiameter - this.dustRadius
          );
      
      if (this.camera.position.distanceTo(ppos) <= this.dustRadius) {
        particle = new THREE.Vertex(ppos);
        this.dustParticles.vertices.push(particle);
      }
    }

    this.dustSystem = new THREE.ParticleSystem(this.dustParticles, pMaterial);
    //this.dustSystem.position.copy(this.camera.position);
    this.dustSystem.sortParticles = false;
    
    // add it to the scene
    this.scene.add(this.dustSystem);
  },
  initControls: function() {
    this.controlsenabled = true;
    /*
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
    this.renderer = (this.usewebgl ? new THREE.WebGLRenderer({antialias: true, maxShadows: 1000}) : new THREE.CanvasRenderer());
    this.renderer.setSize(this.viewsize[0], this.viewsize[1]);

    this.renderer.shadowMapEnabled = true;
    this.renderer.shadowMapSoft = true;
    this.renderer.shadowMapType = THREE.BasicShadowMap;

    this.renderer.autoClear = true;
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
  
    this.newsize = newsize = this.getsize();
    var ts = new Date().getTime();
    
    this.renderer.clear();
    this.renderer.setViewport(0, 0, this.newsize[0], this.newsize[1]);
    
    this.lastupdatedelta = (ts - this.lastupdate) / 1000;
    
    elation.events.fire('renderframe_start', this);
    
    if (this.controls && this.controlsenabled) {
      this.controls.update();
    }
    
    if (elation.utils.physics) {
      elation.utils.physics.system.iterate(this.lastupdatedelta);
    }
    
    elation.events.fire('renderframe_middle', this);
    
    if (this.dustSystem) {
      var pCount = this.dustCount,
          ship = this.objects.player.Player,
          particle;
      
      while (pCount--) {
        particle = this.dustParticles.vertices[pCount];
        
        if (particle && this.camera.position.distanceTo(particle.position) > this.dustRadius) {
          particle.position = ship.matrixWorld.multiplyVector3(new THREE.Vector3(
            Math.random() * this.dustDiameter - this.dustRadius,
            Math.random() * this.dustDiameter - this.dustRadius,
            Math.random() * this.dustDiameter - this.dustRadius
          ));
        }
        
        //particle.position.addSelf(particle.velocity);
      }
      
      this.dustSystem.geometry.__dirtyVertices = true;
    }
    
    if (this.camera) {
      if (this.viewsize[0] != newsize[0] || this.viewsize[1] != newsize[1]) {
        this.viewsize = newsize;
        this.renderer.setSize(this.viewsize[0], this.viewsize[1]);
        this.camera.aspect = this.viewsize[0] / this.viewsize[1];
        this.camera.updateProjectionMatrix();
      }
      
			this.cameraCube.quaternion.copy( this.camera.quaternion );
      this.renderer.render(this.sceneCube, this.cameraCube);
      this.renderer.render(this.scene, this.camera);
    }
    
    elation.events.fire('renderframe_end', this);

    this.stats.update();
    this.lastupdate = ts;
  },
  clearScene: function(root) {
    root = root || this.scene;
    
    for (var i=0; i<this.objects_array.length; i++) {
      root.remove(this.objects_array[i]);
    }
  },
  addObjects: function(thing, root) {
    var currentobj = false;
    if (typeof elation.space.meshes[thing.type] == 'function') {
      currentobj = new elation.space.meshes[thing.type](thing, this);
      console.log("Added new " + thing.type + ": " + thing.parentname + '/' + thing.name, currentobj);
      this.objects_array.push(currentobj);
      if (currentobj.properties && currentobj.properties.physical && currentobj.properties.physical.exists !== 0) {
        root.add(currentobj);

        if (thing.things) {
          for (var k in thing.things) {
            this.addObjects(thing.things[k], currentobj);
          }
        }
      }
      
      if (!this.objects[thing.type])
        this.objects[thing.type] = {};
      
      this.objects[thing.type][currentobj.name] = currentobj;
    } else {
      console.log("don't know how to handle thing type '" + thing.type + "'", thing);
    }
  },
  attachCameraToObject: function(thing, nosave) {
    //this.camera = this.followcamera;
    //this.controlsenabled = false;
    if (thing instanceof THREE.Camera) {
      if (!nosave) {
        this.oldcamera = this.camera;
      }
      this.camera = thing;
    } else if (thing) {
      this.camera.position = thing.position;
      this.camera.rotation = thing.rotation;
      this.camera.quaternion = thing.quaternion;
      this.camera.useTarget = false;
      this.camera.useQuaternion = true;
      console.log('camera attach', this.camera, thing);
    } else {
      if (this.oldcamera) {
        this.camera = this.oldcamera;
      }
    }
    this.camerapos = this.camera.position;
    if (elation.ui.hud && elation.ui.hud.radar) {
      elation.ui.hud.radar.setCamera(this.camera);
    }
  },
  mousemove: function(ev) {
    this.mouse[0] = ( ev.clientX / this.viewsize[0] ) * 2 - 1;
    this.mouse[1] = ( ev.clientY / this.viewsize[1] ) * 2 - 1;
  },
  
  createAdminTool: function() {
    var div = elation.html.create({tag: 'div', classname: "space_world_admin"});
    var component = elation.space.admin("admin", div, { controller: this });
    this.container.appendChild(div);
  }
});

elation.extend('ui.widgets.starbinger', function(hud) {
  this.hud = hud;
  this.rotating = true;
  this.delta = 0;
  this.position = {x:0, y:0, z:0};
  
  this.init = function() {
    this.controller = this.hud.controller;
  }
  
  this.render = function(event) { return;
    this.controller = this.hud.controller;
    
    var c = this.controller.camera,
        s = this.controller.args.sector.things.Star.properties.generated;
    
    //console.log('stuff!!@#JIODJKLDJKLDKLJDJKLD');
    this.hud.debug.log(s);
  }
  
  this.init();
});

/* Starbinger UI Widget */
elation.extend('ui.widgets.planetviewer', function(hud) {
  this.hud = hud;
  this.rotating = true;
  this.delta = 0;
  this.position = {x:0, y:0, z:0};
  
  this.init = function() {
    this.atlas = this.hud.atlas;
    this.buffer = elation.html.create({ tag: 'canvas' });
    this.ctx = this.buffer.getContext('2d');
    
    //var controls = new THREEx.ControlMapper();
    
    var container = elation.find('canvas');
    elation.events.add(container[0], 'planet,renderframe_end', this);
    var obj = {
      "move_left": function(ev) { this.position.x -= ev.value * 100; },
      "move_right": function(ev) { this.position.x += ev.value * 100; },
      "move_forward": function(ev) { this.position.z -= ev.value * 100; },
      "move_backward": function(ev) { this.position.z += ev.value * 100; },
      "move_up": function(ev) { this.position.y += ev.value * 100; },
      "move_down": function(ev) { this.position.y -= ev.value * 100; },
      "move": this.move,
      "wheel": this.mousewheel
    };
    elation.space.controls(0).addContext("atlas_planet", obj);
    /*
    elation.space.controls(0).addBindings("atlas_planet", {
      "keyboard_w": "move_forward",
      "keyboard_a": "move_left",
      "keyboard_s": "move_backward",
      "keyboard_d": "move_right",
      /*
      "mouse_drag_x": "move_left",
      "mouse_drag_y": "move_up"
      *//*
      "mousewheel": "wheel",
      "mouse_drag_delta": "move"
    });
    
    elation.space.controls(0).activateContext("atlas_planet", this);
    */
    elation.events.add(window, 'resize', this);
    //elation.events.add(container[0], 'click,mousedown,mousemove,mouseup,mouseout,mousewheel', this);
  }
  
  this.planet = function(event) {
    console.log('planetevent',event);
    this.planet = event.data.sphere;
    this.radius = event.data.radius;
    this.zoom = 10;
    this.zoominit = this.radius * 2.7;
    this.zoomstep = this.radius / 3.6;
    this.hud = elation.ui.hud;
    this.rotateX = 90;
    this.rotateY = 15;
    this.rotating = true;
    this.delta = 0;
    this.mouse = {x:0,y:0};
    this.viewport = this.hud.controller;
    this.viewport.camera.position.z = (this.zoom * this.zoomstep) + this.zoominit;
    this.zoom = 0;
    this.zoomchange = true;
    
    var canvas = this.buffer,
        ctx = this.ctx,
        width = 4096,
        height = 2048,
        center = { x: (width / 2), y: (height / 2) },
        viewport = this.viewport,
        lnColor = this.hud.color('atlas_planet_lines'),
        dw = width / 36,
        dh = height / 18;
        /*,
        lines = function(bool) {
          var max = bool ? 37 : 19;
          
          for (var i=1; i<max; i++) {
            var n = i * (bool?dw:dh),
                x = bool ? n : width,
                y = bool ? height : n;
            
            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba("+lnColor[0]+", "+lnColor[1]+", "+lnColor[2]+", .9)";
            ctx.moveTo((bool?n:0),(bool?0:n));
            ctx.lineTo(x,y);
            ctx.stroke();
          }
        };*/
    
    canvas.setAttribute('width', width);
    canvas.setAttribute('height', height);
    
    /*
    lines(true);
    lines(false);
    */
    
    var texture = new THREE.Texture( canvas, THREE.UVMapping, THREE.NearestFilter, THREE.NearestFilter ),
        material = new THREE.MeshBasicMaterial({ transparent: true, map: texture, blending: THREE.AdditiveAlphaBlending });
    
    texture.needsUpdate = true;
    
    var sphere = this.sphere = event.data.sphere; //new THREE.Mesh(new THREE.SphereGeometry(this.radius,108,54), material);
        
    //this.sphere.position.x = 0;
    //viewport.scene.add(sphere);
    
    //elation.events.add(sphere, 'mousemove', this);
    
  }
  
  this.render = function() {
    if (this.rotating)
      this.rotateX += .015;
    
    if (this.zoomchange) {
      this.zoomchange = false;
      this.zoompos = (this.zoom * this.zoomstep) + this.zoominit;
    }
    
    if (this.zoompos) {
      var pos = this.viewport.camera.position.z,
          delta = pos - this.zoompos,
          npos = pos - (delta/10);
      
      if (Math.abs(delta) < 1)
        this.zoompos = false;
      
      this.viewport.camera.position.z = npos;
    }
    
    if (this.sphere) {
      var y = this.degree2radian(this.rotateX);
      
      if (this.sphere.rotation.y != y) {
        this.sphere.rotation.y = y
        this.planet.rotation.y = this.degree2radian(this.rotateX) - ((Math.PI/2) * 2);
      }
      if (this.rotateY) {
        this.sphere.rotation.x = this.degree2radian(this.rotateY);
        this.planet.rotation.x = this.degree2radian(this.rotateY);
      }
    }
  }
  
  this.handleEvent = function(event) {
    var type = event.type,
        replace = {
          'mouseout':'mouseup',
          'DOMMouseScroll':'mousewheel'
        };
    
    if (replace[type])
      type = replace[type];
    
    if (typeof this[type] == 'function')
      this[type](event);
    
    event.preventDefault();
  }
  
  this.mousedown = function(event) {
    var mouse = elation.events.coords(event);
    
    this.dragging = true;
    this.mouse = mouse;
    this.omouse = mouse;
  }
  
  this.mousemove = function(event) {
    return;
    
    var point = event.data.point,
        inv = new THREE.Matrix4().getInverse(this.sphere.matrixWorld),
        xform = new THREE.Vector3(point.x, point.y, point.z);
    
    inv.multiplyVector3(xform);
    
    var spherical = this.cartesian2spherical(xform),
        geographic = this.spherical2geographic(spherical),
        geographic = [ geographic[0], geographic[1] ],
        latdiv = elation.id('#atlas_info_lat'),
        lngdiv = elation.id('#atlas_info_lng');
    
    console.log('###',point, xform.x, xform.y, xform.z, spherical, geographic);
    
    latdiv.innerHTML = geographic[0].toFixed(4);
    lngdiv.innerHTML = geographic[1].toFixed(4);
  }
  
  this.move = function(event) {
    //console.log(event.type, this.dragging, event);
    
    //if (!this.dragging)
    //  return;
    
    var wdim = elation.html.dimensions(window),
        x = (wdim.w * event.value[0]) + (wdim.w / 2),
        y = (wdim.h * event.value[1]) + (wdim.h / 2),
        mouse = { x:x, y:y },
        deltaX = event.value[0],
        deltaY = event.value[1],
        degreesX = 100 * -deltaX,
        degreesY = 100 * -deltaY,
        maxtilt = 90;
    
    this.rotateX += degreesX;
    this.rotateY += degreesY;
    this.rotateY = this.rotateY > maxtilt ? maxtilt : this.rotateY < -maxtilt ? -maxtilt : this.rotateY;
    
    this.mouse = mouse;
    this.delta = deltaX;
    //var meh = elation.space.admin.obj.admin.projectMousePosition([mouse.x,mouse.y]);
    
    //console.log(meh);
  }
  
  this.mouseup = function(event) { 
    var mouse = elation.events.coords(event);
    
    this.dragging = false;
    
    if (this.omouse && mouse.x == this.omouse.x && mouse.y == this.omouse.y)
      this.savedot(mouse);
  }
  
  this.mousewheel = function(event) {
		var	event = event ? event : window.event,
        max = 5,
				mwdelta = event.value[0];
		
    if (mwdelta < 0)
      this.zoom++;
    else
      this.zoom--;
    
    this.zoom = this.zoom < -max ? -(max + -((this.zoom + max)/2)) : this.zoom > max ? max : this.zoom;
    
    this.zoomchange = true;
  }
  
  this.craters = function() {
    for (var i=0; i<this.dots.length; i++) {
      var geographic = this.dots[i],
          lnColor = this.hud.color('target_blip'),
          alpha = .6,
          y = (1 - ((parseFloat(geographic[0]) + 90) / 180)) * height,
          t = this.validateLNG(parseFloat(geographic[1]) + 180),
          x = ( (t<0?360+t:t) / 360) * width,
          size = geographic[2] * 6 || 4;
      
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.fillStyle = "rgba("+lnColor[0]+", "+lnColor[1]+", "+lnColor[2]+", "+(alpha/3)+")";
      ctx.arc(x,y,size,0,Math.PI*2,true);
      ctx.fill();
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba("+lnColor[0]+", "+lnColor[1]+", "+lnColor[2]+", "+alpha+")";
      ctx.arc(x,y,size,0,Math.PI*2,true);
      ctx.stroke();
    }
  }
  
  this.cartesian2spherical = function(point) {
    var r = this.radius,
        x = point.x,
        y = point.y,
        z = point.z,
        
        rho = Math.sqrt(Math.pow(x,2) + Math.pow(z,2) + Math.pow(y,2)),
        phi = Math.atan2(y, Math.sqrt(Math.pow(x,2) + Math.pow(z,2))),
        theta = Math.atan2(z, x);
    
    return [rho, phi, theta]; 
  }
  
  this.spherical2cartesian = function(spherical) {
    var r = spherical[2] || 1, sin = Math.sin, cos = Math.cos,
        x = r * (cos(spherical[1]) * sin(spherical[0])),
        y = r * (sin(spherical[1]) * sin(spherical[0])),
        z = r * cos(spherical[0]);
    
    return [x, y, z];
  }
  
  this.spherical2geographic = function(spherical) {
    var dphi = this.radian2degree(spherical[1]),
        dtheta = this.radian2degree(spherical[2]),
        latlng = this.degrees2geographic(dphi, dtheta);
    
    return [latlng[0], latlng[1]];
  }
  
  this.degrees2geographic = function(dphi, dtheta) {
    var lat = dphi,
        lat = dtheta > 0 ? -lat : lat;
        lng = dtheta;
    
    return [lat, lng];
  }
  
  this.degree2radian = function(degree) {
    var radian = (degree * 2 * Math.PI) / 360;
    return radian;
  }
  
  this.radian2degree = function(radian) {
    var degree = radian * (180 / Math.PI);
    return degree;
  }
  
  this.validateLNG = function(lng) {
    var tmp = lng / 360;
    
    lng = (tmp - Math.floor(tmp)) * 360;
    lng = lng > 180 ? lng - 360 : lng; 
    
    return lng;
  }
  
  this.validateLAT = function(lat) {
    lat = lat > 90 
      ? 90 - (lat - 90)
      : lat < -90
        ? -90 - (lat + 90)
        : lat;
    
    return lat;
  }
  
  this.init();
});

function addLensFlare(x,y,z, size, overrideImage){
  var flareColor = new THREE.Color( 0xffffff );

  lensFlare = new THREE.LensFlare( overrideImage, 700, 0.0, THREE.AdditiveBlending, flareColor );

  //	we're going to be using multiple sub-lens-flare artifacts, each with a different size
  lensFlare.add( textureFlare1, 4096, 0.0, THREE.AdditiveBlending );
  lensFlare.add( textureFlare2, 512, 0.0, THREE.AdditiveBlending );
  lensFlare.add( textureFlare2, 512, 0.0, THREE.AdditiveBlending );
  lensFlare.add( textureFlare2, 512, 0.0, THREE.AdditiveBlending );

  //	and run each through a function below
  lensFlare.customUpdateCallback = lensFlareUpdateCallback;

  lensFlare.position = new THREE.Vector3(x,y,z);
  lensFlare.size = size ? size : 16000 ;
  return lensFlare;
}

//	this function will operate over each lensflare artifact, moving them around the screen
function lensFlareUpdateCallback( object ) {
  var f, fl = this.lensFlares.length;
  var flare;
  var vecX = -this.positionScreen.x * 2;
  var vecY = -this.positionScreen.y * 2;
  var size = object.size ? object.size : 16000;

  var camDistance = camera.position.length();

  for( f = 0; f < fl; f ++ ) {
    flare = this.lensFlares[ f ];

    flare.x = this.positionScreen.x + vecX * flare.distance;
    flare.y = this.positionScreen.y + vecY * flare.distance;

    flare.scale = size / camDistance;
    flare.rotation = 0;
  }
}