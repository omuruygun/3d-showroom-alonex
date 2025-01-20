import * as THREE from 'three';

export class DragDropManager {
    constructor(sceneManager, objectManager) {
        this.sceneManager = sceneManager;
        this.objectManager = objectManager;
        this.raycaster = new THREE.Raycaster();
        this.currentDragBlockType = null;
        this.lastIntersectedObject = null;
        this.currentRotation = 0;
        this.isDragging = false;
        this.mouse = new THREE.Vector2();
        this.plane = new THREE.Plane();
        this.planeNormal = new THREE.Vector3(0, 1, 0);
        this.intersectionPoint = new THREE.Vector3();
    }

    getIntersectedObject(e) {
        const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.sceneManager.camera);
        
        const intersects = this.raycaster.intersectObjects(this.sceneManager.scene.children, true);
        
        // Find the first intersection that's either the ground or an interactive object
        for (let intersect of intersects) {
            if (intersect.object.userData.isGround || 
                (intersect.object.userData.isInteractive && !intersect.object.userData.isOutline)) {
                return intersect;
            }
        }
        return null;
    }

    rotateObject(object) {
        if (!object) {
            return;
        }
        this.currentRotation = (this.currentRotation + 90) % 360;
        object.rotation.y = THREE.MathUtils.degToRad(this.currentRotation);
    }

    handleDragStart(e, blockType) {
        e.dataTransfer.setData('blockType', blockType.name);
        e.dataTransfer.effectAllowed = 'move';
        this.currentDragBlockType = blockType;
        this.isDragging = true;
        this.currentRotation = 0;
        
        // Create preview immediately
        this.objectManager.createPreview(blockType).then(preview => {
            if (preview) {
                this.sceneManager.addObject(preview);
            }
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        if (!this.isDragging || !this.objectManager.previewMesh) return;

        const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

        // Get all valid targets (ground and existing objects that are still in the scene)
        const validTargets = [
            ...this.sceneManager.scene.children.filter(obj => obj.userData.isGround),
            ...this.objectManager.objects.filter(obj => 
                obj !== this.objectManager.previewMesh && 
                obj.parent === this.sceneManager.scene
            )
        ];

        const intersects = this.raycaster.intersectObjects(validTargets, true);
        
        if (intersects.length > 0) {
            const intersectionPoint = intersects[0].point;
            let intersectedObject = intersects[0].object;
            
            // Find the top-level interactive object
            while (intersectedObject.parent && !intersectedObject.userData.type) {
                intersectedObject = intersectedObject.parent;
            }

            let finalPosition = intersectionPoint.clone();

            // If we intersected with an existing object (not ground)
            if (intersectedObject.userData.type === 'glb' && intersectedObject.parent === this.sceneManager.scene) {
                const existingBBox = new THREE.Box3().setFromObject(intersectedObject);
                const previewBBox = new THREE.Box3().setFromObject(this.objectManager.previewMesh);
                
                // If we're near the top, stack
                if (intersectionPoint.y > existingBBox.max.y - 0.2) {
                    const center = existingBBox.getCenter(new THREE.Vector3());
                    finalPosition.x = center.x;
                    finalPosition.z = center.z;
                    finalPosition.y = existingBBox.max.y;
                } else {
                    // Place beside based on closest edge
                    const center = existingBBox.getCenter(new THREE.Vector3());
                    const toPoint = new THREE.Vector2(
                        intersectionPoint.x - center.x,
                        intersectionPoint.z - center.z
                    );
                    
                    // Determine the closest edge
                    const angle = Math.atan2(toPoint.y, toPoint.x);
                    const PI4 = Math.PI / 4;
                    
                    if (angle > -PI4 && angle <= PI4) {
                        // Right side
                        finalPosition.x = existingBBox.max.x + (previewBBox.max.x - previewBBox.min.x) / 2;
                        finalPosition.z = center.z;
                    } else if (angle > PI4 && angle <= 3 * PI4) {
                        // Front side
                        finalPosition.x = center.x;
                        finalPosition.z = existingBBox.max.z + (previewBBox.max.z - previewBBox.min.z) / 2;
                    } else if (angle > -3 * PI4 && angle <= -PI4) {
                        // Back side
                        finalPosition.x = center.x;
                        finalPosition.z = existingBBox.min.z - (previewBBox.max.z - previewBBox.min.z) / 2;
                    } else {
                        // Left side
                        finalPosition.x = existingBBox.min.x - (previewBBox.max.x - previewBBox.min.x) / 2;
                        finalPosition.z = center.z;
                    }
                    finalPosition.y = 0;
                }
                this.lastIntersectedObject = intersectedObject;
            } else {
                // Ground intersection
                this.lastIntersectedObject = null;
                finalPosition.x = Math.round(finalPosition.x);
                finalPosition.z = Math.round(finalPosition.z);
                finalPosition.y = 0;
            }

            // Update preview mesh position
            this.objectManager.previewMesh.position.copy(finalPosition);
        }
    }

    handleDragLeave(e) {
        e.preventDefault();
        if (this.objectManager.previewMesh) {
            this.sceneManager.removeObject(this.objectManager.previewMesh);
            this.objectManager.previewMesh = null;
        }
        this.lastIntersectedObject = null;
        this.isDragging = false;
    }

    handleDrop(e) {
        e.preventDefault();
        if (!this.isDragging || !this.objectManager.previewMesh) return;

        // Create the final object at the preview position
        const finalPosition = this.objectManager.previewMesh.position.clone();
        
        this.objectManager.createObject(
            this.currentDragBlockType,
            finalPosition,
            this.objectManager.previewMesh.rotation.y
        ).then(object => {
            if (object) {
                this.sceneManager.addObject(object);
                this.objectManager.addObject(object);

                // Set up parent-child relationship if stacked
                if (this.lastIntersectedObject) {
                    object.userData.parent = this.lastIntersectedObject;
                    if (!this.lastIntersectedObject.userData.children) {
                        this.lastIntersectedObject.userData.children = [];
                    }
                    this.lastIntersectedObject.userData.children.push(object);
                }
            }
        });

        // Cleanup
        this.cleanup();
    }

    cleanup() {
        this.currentDragBlockType = null;
        this.lastIntersectedObject = null;
        this.isDragging = false;
        this.currentRotation = 0;
        if (this.objectManager.previewMesh) {
            this.sceneManager.removeObject(this.objectManager.previewMesh);
            this.objectManager.previewMesh = null;
        }
    }

    snapToGrid(value) {
        const gridSize = this.sceneManager.gridSize;
        return Math.round(value / gridSize) * gridSize;
    }

    // Reset all state
    reset() {
        this.currentDragBlockType = null;
        this.lastIntersectedObject = null;
        this.currentRotation = 0;
        this.isDragging = false;
        this.mouse.set(0, 0);
        this.intersectionPoint.set(0, 0, 0);
    }
}