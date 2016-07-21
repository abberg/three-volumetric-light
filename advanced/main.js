(function(){

    var scene, camera, renderer, composer,
        occlusionRenderTarget, occlusionComposer,
        renderScale = 0.5,

        pointLight,
        lightMesh,
        
        box,
        occludingBox,
        angle = 0,

        volumetricShaderPass,
        hblurShaderPass,
        vblurShaderPass,

        gui = new dat.GUI(),
        stats = new Stats();

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
        renderer = new THREE.WebGLRenderer(); 

        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );

        document.body.appendChild( renderer.domElement );
        document.body.appendChild( stats.dom );

        function setupScene(){
            
            var ambientLight,
                geometry,
                material,
                canvas,
                ctx,
                gradient,
                texture;
            
            pointLight = new THREE.PointLight(0xffffff);
            scene.add(pointLight);

            ambientLight = new THREE.AmbientLight(0x2c3e50);
            scene.add(ambientLight);

            canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            texture = new THREE.Texture(canvas);
            ctx = canvas.getContext('2d');
            drawSunGradient(ctx, 1, '#fff');
            texture.needsUpdate = true;
            
            geometry = new THREE.PlaneGeometry(2, 2)  
            material = new THREE.MeshBasicMaterial( { map: texture, side:THREE.DoubleSide } );

            lightMesh = new THREE.Mesh( geometry, material );
            lightMesh.layers.set( 1 );
            scene.add( lightMesh );
            
            geometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
            material = new THREE.MeshPhongMaterial( { color: 0xe74c3c } );
            box = new THREE.Mesh( geometry, material );
            box.position.z = 2;
            scene.add( box );

            material = new THREE.MeshBasicMaterial( { color: 0x000000 } );
            occludingBox = new THREE.Mesh( geometry, material );
            occludingBox.position.z = 2;
            occludingBox.layers.set( 1 );
            scene.add( occludingBox );

            camera.position.z = 6;

        }

        function drawSunGradient(ctx, hardness, color){
            
            var gradient = ctx.createRadialGradient(128,128,128,128,128,0);
            
            gradient.addColorStop( 0, '#000' );
            gradient.addColorStop( hardness, color );
            ctx.fillStyle = gradient;
            ctx.fillRect(0,0,256,256);
        
        }
        
        function setupPostprocessing(){

            var addPass;

            occlusionRenderTarget = new THREE.WebGLRenderTarget( window.innerWidth * renderScale, window.innerHeight * renderScale );
            occlusionComposer = new THREE.EffectComposer( renderer, occlusionRenderTarget);
                              
            occlusionComposer.addPass( new THREE.RenderPass( scene, camera ) );

            hblurShaderPass = new THREE.ShaderPass( THREE.HorizontalBlurShader );
            hblurShaderPass.uniforms.h.value = 1 / window.innerWidth;
            occlusionComposer.addPass( hblurShaderPass );

            vblurShaderPass = new THREE.ShaderPass( THREE.VerticalBlurShader );
            vblurShaderPass.uniforms.v.value = 1 / window.innerHeight;
            occlusionComposer.addPass( vblurShaderPass );

            volumetricShaderPass = new THREE.ShaderPass( THREE.VolumetericLightShader );
            volumetricShaderPass.needsSwap = false;
            occlusionComposer.addPass( volumetricShaderPass );

            composer = new THREE.EffectComposer( renderer );
            composer.addPass( new THREE.RenderPass( scene, camera ) );

            addPass = new THREE.ShaderPass( THREE.AdditiveBlendingShader );
            addPass.uniforms.tAdd.value = occlusionRenderTarget.texture;
            composer.addPass( addPass );

            addPass.renderToScreen = true;

        }

        function update(){

            var radius = 2,
                xpos = Math.sin( angle ) * radius,
                zpos = Math.cos( angle ) * radius;

            box.position.set( xpos, 0, zpos);
            box.rotation.x += 0.01;
            box.rotation.y += 0.01;

            occludingBox.position.copy(box.position);
            occludingBox.rotation.copy(box.rotation);

            angle += 0.02;

            lightMesh.quaternion.copy(camera.quaternion);

            stats.update();

        }
        
        function render(){

            camera.layers.set( 1 );
            renderer.setClearColor(0x000000);
            occlusionComposer.render();

            camera.layers.set( 0 );
            renderer.setClearColor(0x090611);
            composer.render();
        
        } 

        function onFrame(){
            requestAnimationFrame( onFrame );
            update();
            render();
        }

        window.addEventListener( 'resize', function(){

            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();

            renderer.setSize( window.innerWidth, window.innerHeight );

            var pixelRatio = renderer.getPixelRatio(),
                newWidth  = Math.floor( window.innerWidth / pixelRatio ) || 1,
                newHeight = Math.floor( window.innerHeight / pixelRatio ) || 1;

            composer.setSize( newWidth, newHeight );
            occlusionComposer.setSize( newWidth * renderScale, newHeight * renderScale );
        
        }, false );

        function populateGUI(){
            addLightControls();
            addShaderControls();
            addBlurControls();
            addRenderTargetImage();
        }

        function addLightControls(){
            var folder,
                light = {
                    color: '#fff',
                    hardness: 0,
                    radius: 1
                },
                
                updateLightPosition = function(){
                    
                    var p = lightMesh.position.clone(),
                        vector = p.project(camera),
                        x = ( vector.x + 1 ) / 2,
                        y = ( vector.y + 1 ) / 2;
                    
                    rays.uniforms.lightPosition.value.set(x, y);

                    pointLight.position.copy(lightMesh.position);
                 
                },
                 
                updateLightColor = function(val){

                    var texture = lightMesh.material.map,
                        ctx = texture.image.getContext('2d');

                    drawSunGradient(ctx, 1, val );
                    texture.needsUpdate = true;

                    pointLight.color = new THREE.Color(val);

                },
                 
                updateLightHardness = function(val){
                    
                    var texture = lightMesh.material.map,
                        ctx = texture.image.getContext('2d'),
                        colorStop = (100 - val) / 100;

                    if(colorStop === 0){
                        colorStop = 0.005;
                    }

                    drawSunGradient(ctx, colorStop, light.color );
                    texture.needsUpdate = true;

                    pointLight.color = new THREE.Color(val);
                },
                 
                updateLightSize = function(val){
                    lightMesh.scale.set(val/1, val/1, 1);
                };

            folder = gui.addFolder('Light');
            folder.addColor(light, 'color').onChange(updateLightColor),
            folder.add(light, 'hardness').min(0).max(100).onChange(updateLightHardness);
            folder.add(light, 'radius').min(0).max(4).onChange(updateLightSize);
            folder.add(lightMesh.position, 'x').min(-10).max(10).step(0.1).onChange(updateLightPosition);
            folder.add(lightMesh.position, 'y').min(-10).max(10).step(0.1).onChange(updateLightPosition);
            folder.add(lightMesh.position, 'z').min(-10).max(10).step(0.1).onChange(updateLightPosition);
            folder.open();

        }

        function addShaderControls(){
            var u = volumetricShaderPass.uniforms,
                folder = gui.addFolder('Volumeteric Light Shader');

            folder.add(u.exposure, 'value').min(0).max(1).step(0.1).name('exposure');
            folder.add(u.decay, 'value').min(0.8).max(1).step(0.001).name('decay');
            folder.add(u.density, 'value').min(0).max(1).step(0.01).name('density');
            folder.add(u.weight, 'value').min(0).max(1).step(0.01).name('weight');
            folder.add(u.samples, 'value').min(1).max(100).step(1).name('samples');
            
            folder.open();
        }

        function addBlurControls(){
            
            var folder = gui.addFolder('Blur Shader');
            
            folder.add({blur:1}, 'blur')
                .min(0.0).max(3)
                .onChange(function(value) {
                    hblurShaderPass.uniforms.h.value = value / window.innerWidth;
                    vblurShaderPass.uniforms.v.value = value / window.innerHeight;
                });
            folder.open();
        }

        function addRenderTargetImage(){
            
            var material,
                mesh,
                folder;

            material = new THREE.ShaderMaterial( THREE.PassThroughShader );
            material.uniforms.tDiffuse.value = occlusionRenderTarget.texture;
            
            mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), material );
            composer.passes[1].scene.add( mesh );
            mesh.visible = false;

            folder = gui.addFolder('Light Pass Render Image');
            folder.add(mesh, 'visible');
            folder.add({scale:0.5}, 'scale', { Full: 1, Half: 0.5, Quarter: 0.25 })
                .onChange(function(value) {
                    renderScale = value;
                    window.dispatchEvent(new Event('resize'));
                });
            folder.open();

        }

    setupScene();
    setupPostprocessing();
    populateGUI();
    onFrame();

}());