(function(){
    
    var scene, camera, renderer, 
        composer, box,
        occlusionComposer, occlusionBox,
        
        angle = 0,

        DEFAULT_LAYER = 0,
        OCCLUSION_LAYER = 1;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    function setupScene(){
        
        var ambientLight,
            pointLight,
            geometry,
            material,
            lightSphere;
        
        ambientLight = new THREE.AmbientLight(0x2c3e50);
        scene.add(ambientLight);
        pointLight = new THREE.PointLight(0xffffff);
        scene.add(pointLight);
        
        geometry = new THREE.SphereBufferGeometry( 1, 16, 16 );
        material = new THREE.MeshBasicMaterial( { color: 0xffffff } );
        lightSphere = new THREE.Mesh( geometry, material );
        lightSphere.layers.set( OCCLUSION_LAYER );
        scene.add( lightSphere );
        
        geometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
        material = new THREE.MeshPhongMaterial( { color: 0xe74c3c } );
        box = new THREE.Mesh( geometry, material );
        box.position.z = 2;
        scene.add( box );
        
        material = new THREE.MeshBasicMaterial( { color:0x000000 } );
        occlusionBox = new THREE.Mesh( geometry, material);
        occlusionBox.position.z = 2;
        occlusionBox.layers.set( OCCLUSION_LAYER );
        scene.add( occlusionBox );
        
        camera.position.z = 6;
    }

    function setupPostprocessing(){
        
        var pass,
            occlusionRenderTarget = new THREE.WebGLRenderTarget( window.innerWidth * 0.5, window.innerHeight * 0.5 );
        
        occlusionComposer = new THREE.EffectComposer( renderer, occlusionRenderTarget);
        occlusionComposer.addPass( new THREE.RenderPass( scene, camera ) );
        pass = new THREE.ShaderPass( THREE.VolumetericLightShader );
        pass.needsSwap = false;
        occlusionComposer.addPass( pass );

        composer = new THREE.EffectComposer( renderer );
        composer.addPass( new THREE.RenderPass( scene, camera ) );
        pass = new THREE.ShaderPass( THREE.AdditiveBlendingShader );
        pass.uniforms.tAdd.value = occlusionRenderTarget.texture;
        composer.addPass( pass );
        pass.renderToScreen = true;
    
    }
      
    function onFrame(){
    
        requestAnimationFrame( onFrame );
        update();
        render();
    
    }
      
    function update(){

        var radius = 2.5,
            xpos = Math.sin(angle) * radius,
            zpos = Math.cos(angle) * radius;
        
        box.position.set( xpos, 0, zpos);
        box.rotation.x += 0.01;
        box.rotation.y += 0.01;
        
        occlusionBox.position.copy(box.position);
        occlusionBox.rotation.copy(box.rotation);
        
        angle += 0.02;
    }

    function render(){

        camera.layers.set(OCCLUSION_LAYER);
        renderer.setClearColor(0x000000);
        occlusionComposer.render();
        
        camera.layers.set(DEFAULT_LAYER);
        renderer.setClearColor(0x090611);
        composer.render();

    }
      
    setupScene();
    setupPostprocessing();
    onFrame();
}());