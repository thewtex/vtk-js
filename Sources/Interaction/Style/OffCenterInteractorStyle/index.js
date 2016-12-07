
import { vec3, mat4 } from 'gl-matrix';
import * as macro from '../../../macro';
import vtkInteractorStyleTrackballCamera from '../../../Interaction/Style/InteractorStyleTrackballCamera';
import vtkMath from './../../../Common/Core/Math';

// ----------------------------------------------------------------------------
// vtkPvInteractorStyle methods
// ----------------------------------------------------------------------------

function vtkOffCenterInteractorStyle(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkOffCenterInteractorStyle');

  //--------------------------------------------------------------------------
  publicAPI.rotate = () => {
    if (model.currentRenderer === null) {
      return;
    }

    const ren = model.currentRenderer;
    const rwi = model.interactor;

    const lastPtr = rwi.getPointerIndex();
    const pos = rwi.getEventPosition(lastPtr);
    const lastPos = rwi.getLastEventPosition(lastPtr);

    const camera = model.currentRenderer.getActiveCamera();
    const cameraPos = camera.getPosition();
    const cameraFp = camera.getFocalPoint();

    const trans = mat4.create();
    mat4.identity(trans);

    const center = model.centerOfRotation;
    const rotationFactor = model.rotationFactor;

    // Translate to center
    mat4.translate(trans, trans, vec3.fromValues(center[0], center[1], center[2]));

    const dx = lastPos.x - pos.x;
    const dy = lastPos.y - pos.y;

    const size = rwi.getView().getSize();

    // Azimuth
    const viewUp = camera.getViewUp();
    mat4.rotate(trans, trans, vtkMath.radiansFromDegrees(((360.0 * dx) / size[0]) * rotationFactor), vec3.fromValues(viewUp[0], viewUp[1], viewUp[2]));

    // Elevation
    const v2 = [0, 0, 0];
    vtkMath.cross(camera.getDirectionOfProjection(), viewUp, v2);
    mat4.rotate(trans, trans, vtkMath.radiansFromDegrees(((-360.0 * dy) / size[1]) * rotationFactor), vec3.fromValues(v2[0], v2[1], v2[2]));

    // Translate back
    mat4.translate(trans, trans, vec3.fromValues(-center[0], -center[1], -center[2]));

    const newCamPos = vec3.create();
    const newFp = vec3.create();
    const newViewUp = vec3.create();

    // Apply transformation to camera position, focal point, and view up
    vec3.transformMat4(newCamPos, vec3.fromValues(cameraPos[0], cameraPos[1], cameraPos[2]), trans);
    vec3.transformMat4(newFp, vec3.fromValues(cameraFp[0], cameraFp[1], cameraFp[2]), trans);
    vec3.transformMat4(newViewUp, vec3.fromValues(viewUp[0] + cameraPos[0], viewUp[1] + cameraPos[1], viewUp[2] + cameraPos[2]), trans);

    camera.setPosition(newCamPos[0], newCamPos[1], newCamPos[2]);
    camera.setFocalPoint(newFp[0], newFp[1], newFp[2]);
    camera.setViewUp(newViewUp[0] - newCamPos[0], newViewUp[1] - newCamPos[1], newViewUp[2] - newCamPos[2]);
    camera.orthogonalizeViewUp();

    ren.resetCameraClippingRange();
    rwi.render();
  };

  //--------------------------------------------------------------------------
  publicAPI.pan = () => {
    if (model.currentRenderer === null) {
      return;
    }

    const ren = model.currentRenderer;
    const rwi = model.interactor;

    const camera = model.currentRenderer.getActiveCamera();

    const lastPtr = rwi.getPointerIndex();
    const pos = rwi.getEventPosition(lastPtr);
    const lastPos = rwi.getLastEventPosition(lastPtr);

    const camPos = camera.getPosition();
    const fp = camera.getFocalPoint();

    if (camera.getParallelProjection()) {
      camera.orthogonalizeViewUp();

      const up = camera.getViewUp();
      const vpn = camera.getViewPlaneNormal();

      const right = [0, 0, 0];

      vtkMath.cross(vpn, up, right);

      // These are different because y is flipped.
      const size = rwi.getView().getSize();
      let dx = (pos.x - lastPos.x) / size[1];
      let dy = (lastPos.y - pos.y) / size[1];

      const scale = camera.getParallelScale();
      dx *= scale * 2.0;
      dy *= scale * 2.0;

      let tmp = (right[0] * dx) + (up[0] * dy);
      camPos[0] += tmp;
      fp[0] += tmp;
      tmp = (right[1] * dx) + (up[1] * dy);
      camPos[1] += tmp;
      fp[1] += tmp;
      tmp = (right[2] * dx) + (up[2] * dy);
      camPos[2] += tmp;
      fp[2] += tmp;
      camera.setPosition(camPos);
      camera.setFocalPoint(fp);
    } else {
      const center = model.centerOfRotation;
      const focalDepth = publicAPI.computeWorldToDisplay(center[0], center[1], center[2])[2];

      const worldPoint = publicAPI.computeDisplayToWorld(pos.x, pos.y, focalDepth);
      const lastWorldPoint = publicAPI.computeDisplayToWorld(lastPos.x, lastPos.y, focalDepth);

      const newCamPos = [
        camPos[0] + (lastWorldPoint[0] - worldPoint[0]),
        camPos[1] + (lastWorldPoint[1] - worldPoint[1]),
        camPos[2] + (lastWorldPoint[2] - worldPoint[2]),
      ];

      const newFp = [
        fp[0] + (lastWorldPoint[0] - worldPoint[0]),
        fp[1] + (lastWorldPoint[1] - worldPoint[1]),
        fp[2] + (lastWorldPoint[2] - worldPoint[2]),
      ];

      camera.setPosition(newCamPos[0], newCamPos[1], newCamPos[2]);
      camera.setFocalPoint(newFp[0], newFp[1], newFp[2]);
    }

    ren.resetCameraClippingRange();
    rwi.render();
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  centerOfRotation: [0.0, 0.0, 0.0],
  rotationFactor: 1.0,
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Inheritance
  vtkInteractorStyleTrackballCamera.extend(publicAPI, model);

  // Object methods
  macro.obj(publicAPI, model);

  // Create get-set macros
  macro.setGet(publicAPI, model, ['rotationFactor']);

  macro.setGetArray(publicAPI, model, [
    'centerOfRotation',
  ], 3);

  // Object specific methods
  vtkOffCenterInteractorStyle(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend);

// ----------------------------------------------------------------------------

export default Object.assign({ newInstance, extend });
