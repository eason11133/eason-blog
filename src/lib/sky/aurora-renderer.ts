/**
 * Lightweight WebGL1 aurora renderer based on the isolated aurora lab shader.
 * No Three.js dependency; only used during a scheduled aurora event.
 */
export interface AuroraRenderer {
  draw(timeSeconds: number, intensity: number, seed: number): boolean;
}

const VERTEX_SHADER = "\nattribute vec2 aPosition;\nvarying vec2 vUv;\nvoid main() {\n  vUv = aPosition * .5 + .5;\n  gl_Position = vec4(aPosition, 0., 1.);\n}";

const FRAGMENT_SHADER = "\nprecision mediump float;\nvarying vec2 vUv;\nuniform float uTime;\nuniform float uIntensity;\nuniform float uSeed;\n\nfloat hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }\nfloat noise(vec2 p) {\n  vec2 i=floor(p), f=fract(p);\n  vec2 u=f*f*(3.0-2.0*f);\n  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),\n             mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);\n}\nfloat fbm(vec2 p) {\n  float v=0.0, a=.5;\n  for(int i=0;i<3;i++) { v+=a*noise(p); p=p*2.05+vec2(5.32,2.61); a*=.5; }\n  return v;\n}\nfloat curtain(vec2 p,float t,float seed,float level,float phase) {\n  float x=p.x;\n  float warp=(fbm(vec2(x*4.2+seed,t*.085))-.5)*.085;\n  float xx=x+warp;\n  float rim=level+.058*sin(xx*7.6+t*.19+phase)\n           +.031*sin(xx*14.4-t*.14+phase*1.7)\n           +.025*(noise(vec2(xx*6.5+seed,t*.055))-.5);\n  float below=rim-p.y;\n  float upper=smoothstep(-.014,.024,below);\n  float decay=exp(-max(below,0.)*8.0);\n  float fold=noise(vec2(xx*35.+seed*9.,t*.052));\n  float stripe=pow(.5+.5*sin(xx*118.+fold*5.+t*.16),2.);\n  float texture=.37+.63*(fold*.56+stripe*.44);\n  float highlight=.19*exp(-abs(below)*51.);\n  float sides=smoothstep(-.18,.09,x)*(1.-smoothstep(.82,1.16,x));\n  return (upper*decay*texture+highlight)*sides;\n}\nvoid main() {\n  vec2 p=vUv;\n  float t=uTime;\n  float a=curtain(p,t,uSeed,.65,.3);\n  float b=curtain(p+vec2(-.11,.034),t*.77,uSeed+3.7,.64,2.2);\n  float c=curtain(p+vec2(.19,-.027),t*.66,uSeed+9.1,.73,1.3);\n  float shimmer=fbm(vec2(p.x*7.4,t*.12+uSeed));\n  vec3 green=mix(vec3(.08,.79,.50),vec3(.15,.94,.73),shimmer);\n  vec3 cyan=vec3(.10,.57,.79), purple=vec3(.52,.34,.78);\n  float purpleShare=.06+.08*smoothstep(.5,.9,shimmer);\n  vec3 light=green*a*.92+cyan*b*.57+purple*c*purpleShare;\n  float alpha=clamp(max(a*.83,max(b*.50,c*purpleShare))*uIntensity,0.,.84);\n  gl_FragColor=vec4(clamp(light*1.55,0.,1.),alpha);\n}";

export function createAuroraRenderer(canvas: HTMLCanvasElement): AuroraRenderer | null {
  let context: WebGLRenderingContext | null = null;
  try {
    context = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });
  } catch {
    return null;
  }
  if (!context) return null;
  const gl = context;

  const compile = (type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Could not create WebGL shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const reason = gl.getShaderInfoLog(shader) || 'unknown shader error';
      gl.deleteShader(shader);
      throw new Error(reason);
    }
    return shader;
  };

  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  try {
    const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    program = gl.createProgram();
    if (!program) throw new Error('Could not create WebGL program');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'Failed to link WebGL shaders');
    }
    gl.useProgram(program);
    buffer = gl.createBuffer();
    if (!buffer) throw new Error('Could not allocate WebGL buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, 'aPosition');
    if (position < 0) throw new Error('Missing aPosition attribute');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  } catch (error) {
    console.warn('Aurora WebGL initialization failed; falling back to CSS', error);
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    return null;
  }

  const timeLocation = gl.getUniformLocation(program, 'uTime');
  const intensityLocation = gl.getUniformLocation(program, 'uIntensity');
  const seedLocation = gl.getUniformLocation(program, 'uSeed');
  if (!timeLocation || !intensityLocation || !seedLocation) return null;

  return {
    draw(timeSeconds, intensity, seed) {
      if (gl.isContextLost()) return false;
      const mobile = window.innerWidth <= 900;
      // Render at reduced resolution to avoid expensive full-screen noise.
      const ratio = Math.min(window.devicePixelRatio || 1, 1.4) * (mobile ? .52 : .66);
      const width = Math.min(1280, Math.max(1, Math.round(canvas.clientWidth * ratio)));
      const height = Math.min(800, Math.max(1, Math.round(canvas.clientHeight * ratio)));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      gl.useProgram(program);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(timeLocation, timeSeconds);
      gl.uniform1f(intensityLocation, intensity);
      gl.uniform1f(seedLocation, seed);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      return true;
    },
  };
}
