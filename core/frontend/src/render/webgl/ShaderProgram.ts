/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
 *--------------------------------------------------------------------------------------------*/

import { assert, IDisposable } from "@bentley/bentleyjs-core";
import { UniformHandle, AttributeHandle } from "./Handle";
import { ShaderProgramParams, DrawParams } from "./DrawCommand";
import { GLDisposable } from "./GLDisposable";
import { GL } from "./GL";
import { Target } from "./Target";
import { RenderPass } from "./RenderFlags";
import { TechniqueFlags } from "./TechniqueFlags";

/** Describes the location of a uniform variable within a shader program. */
export class Uniform {
  private readonly _name: string;
  protected _handle?: UniformHandle;

  protected constructor(name: string) { this._name = name; }

  public compile(gl: WebGLRenderingContext, prog: ShaderProgram): boolean {
    assert(!this.isValid);
    if (undefined !== prog.glProgram) {
      this._handle = UniformHandle.create(gl, prog.glProgram, this._name, true);
    }

    return this.isValid;
  }

  public get isValid(): boolean { return undefined !== this._handle; }
}

/**
 * A function associated with a ProgramUniform which is invoked each time the shader program becomes active.
 * The function is responsible for setting the value of the uniform.
 */
export type BindProgramUniform = (uniform: UniformHandle, params: ShaderProgramParams) => void;

/**
 * Describes the location of a uniform variable within a shader program, the value of which does not change while the program is active.
 * The supplied binding function will be invoked once each time the shader becomes active to set the value of the uniform.
 */
export class ProgramUniform extends Uniform {
  private readonly _bind: BindProgramUniform;

  public constructor(name: string, bind: BindProgramUniform) {
    super(name);
    this._bind = bind;
  }

  public bind(params: ShaderProgramParams): void {
    if (undefined !== this._handle) {
      this._bind(this._handle, params);
    }
  }
}

/**
 * A function associated with a GraphicUniform which is invoked each time a new graphic primitive is rendered using the associated shader.
 * The function is responsible for setting the value of the uniform.
 */
export type BindGraphicUniform = (uniform: UniformHandle, params: DrawParams) => void;

/**
 * Describes the location of a uniform variable within a shader program, the value of which is dependent upon the graphic primitive
 * currently being rendered by the program. The supplied binding function will be invoked once for each graphic primitive submitted
 * to the program to set the value of the uniform.
 */
export class GraphicUniform extends Uniform {
  private readonly _bind: BindGraphicUniform;

  public constructor(name: string, bind: BindGraphicUniform) {
    super(name);
    this._bind = bind;
  }

  public bind(params: DrawParams): void {
    if (undefined !== this._handle) {
      this._bind(this._handle, params);
    }
  }
}

/** A function associated with an Attribute which is invoked to bind the attribute data. */
export type BindAttribute = (attr: AttributeHandle, params: DrawParams) => void;

/** Describes the location of an attribute within a shader program along with a function for binding the attribute's data */
export class Attribute {
  private readonly _name: string;
  private readonly _bind: BindAttribute;
  private _handle?: AttributeHandle;

  public constructor(name: string, bind: BindAttribute) {
    this._name = name;
    this._bind = bind;
  }

  public compile(gl: WebGLRenderingContext, prog: ShaderProgram): boolean {
    assert(!this.isValid);
    if (undefined !== prog.glProgram) {
      this._handle = AttributeHandle.create(gl, prog.glProgram, this._name, true);
    }

    return this.isValid;
  }

  public get isValid(): boolean { return undefined !== this._handle; }
  public bind(params: DrawParams): void {
    if (undefined !== this._handle) {
      this._bind(this._handle, params);
    }
  }
}

/** Describes the compilation status of a shader program. Programs may be compiled during idle time, or upon first use. */
export const enum CompileStatus {
  Success,    // The program was successfully compiled.
  Failure,    // The program failed to compile.
  Uncompiled, // No attempt has yet been made to compile the program.
}

export class ShaderProgram implements GLDisposable {
  private _description: string; // for debugging purposes...
  public readonly vertSource: string;
  public readonly fragSource: string;
  private _glProgram?: WebGLProgram;
  private _inUse: boolean = false;
  private _status: CompileStatus = CompileStatus.Uncompiled;
  private readonly _programUniforms = new Array<ProgramUniform>();
  private readonly _graphicUniforms = new Array<GraphicUniform>();
  private readonly _attributes = new Array<Attribute>();

  public constructor(vertSource: string, fragSource: string, description: string, gl: WebGLRenderingContext) {
    this._description = description;
    this.vertSource = vertSource;
    this.fragSource = fragSource;

    const glProgram = gl.createProgram();
    this._glProgram = (null === glProgram) ? undefined : glProgram;

    // ###TODO: Silencing 'unused variable' warnings temporarily...
    assert(undefined !== this._description);
  }

  public dispose(gl: WebGLRenderingContext): void {
    if (undefined !== this._glProgram && null !== this._glProgram) {
      assert(!this._inUse);
      gl.deleteProgram(this._glProgram);
      this._glProgram = undefined;
      this._status = CompileStatus.Uncompiled;
    }
  }

  public get isValid(): boolean { return undefined !== this.glProgram; }
  public get glProgram(): WebGLProgram | undefined { return this._glProgram; }
  public get isUncompiled() { return CompileStatus.Uncompiled === this._status; }

  private compileShader(gl: WebGLRenderingContext, type: GL.ShaderType): WebGLShader | undefined {
    const shader = gl.createShader(type);
    if (null === shader) {
      return undefined;
    }

    const src = GL.ShaderType.Vertex === type ? this.vertSource : this.fragSource;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    const succeeded = gl.getShaderParameter(shader, GL.ShaderParameter.CompileStatus) as boolean;
    assert(succeeded);
    return succeeded ? shader : undefined;
  }
  private linkProgram(gl: WebGLRenderingContext, vert: WebGLShader, frag: WebGLShader): boolean {
    assert(undefined !== this.glProgram);
    if (undefined === this._glProgram || null === this._glProgram) { // because WebGL APIs used Thing|null, not Thing|undefined...
      return false;
    }

    gl.attachShader(this._glProgram, vert);
    gl.attachShader(this._glProgram, frag);
    gl.linkProgram(this._glProgram);
    return gl.getProgramParameter(this._glProgram, GL.ProgramParameter.LinkStatus) as boolean;
  }
  public compile(gl: WebGLRenderingContext): boolean {
    switch (this._status) {
      case CompileStatus.Failure: return false;
      case CompileStatus.Success: return true;
      default: {
        if (!this.isValid) {
          this._status = CompileStatus.Failure;
          return false;
        }
        break;
      }
    }

    const vert = this.compileShader(gl, GL.ShaderType.Vertex);
    const frag = this.compileShader(gl, GL.ShaderType.Fragment);
    if (undefined !== vert && undefined !== frag) {
      if (this.linkProgram(gl, vert, frag)) {
        this._status = CompileStatus.Success;
        return true;
      }
    }

    this._status = CompileStatus.Failure;
    return false;
  }

  public use(params: ShaderProgramParams): boolean {
    if (!this.compile(params.context)) {
      return false;
    }

    assert(undefined !== this._glProgram);
    if (null === this._glProgram || undefined === this._glProgram) {
      return false;
    }

    assert(!this._inUse);
    this._inUse = true;
    params.context.useProgram(this._glProgram);

    for (const uniform of this._programUniforms) {
      if (!uniform.bind(params)) {
        return false;
      }
    }

    return true;
  }
  public endUse(gl: WebGLRenderingContext) {
    assert(this._inUse);
    this._inUse = false;
    gl.useProgram(null);
  }

  public draw(params: DrawParams): void {
    assert(this._inUse);
    for (const uniform of this._graphicUniforms) {
      uniform.bind(params);
    }

    for (const attribute of this._attributes) {
      attribute.bind(params);
    }

    // ###TODO params.geometry.draw(params.context);
  }

  public addProgramUniform(name: string, binding: BindProgramUniform) {
    assert(this.isUncompiled);
    this._programUniforms.push(new ProgramUniform(name, binding));
  }
  public addGraphicUniform(name: string, binding: BindGraphicUniform) {
    assert(this.isUncompiled);
    this._graphicUniforms.push(new GraphicUniform(name, binding));
  }
  public addAttribute(name: string, binding: BindAttribute) {
    assert(this.isUncompiled);
    this._attributes.push(new Attribute(name, binding));
  }
}

// Context in which ShaderPrograms are executed. Avoids switching shaders unnecessarily.
// Ensures shader programs are compiled before use and un-bound when scope is disposed.
// This class must *only* be used inside a using() function!
export class ShaderProgramExecutor implements IDisposable {
  private _program?: ShaderProgram;
  private _params: ShaderProgramParams;

  public constructor(target: Target, pass: RenderPass, program?: ShaderProgram) {
    this._params = new ShaderProgramParams(target, pass);
    this.changeProgram(program);
  }

  public dispose() { this.changeProgram(undefined); }

  public setProgram(program: ShaderProgram) { this.changeProgram(program); }
  public get isValid() { return undefined !== this._program; }

  public draw(params: DrawParams) {
    assert(this.isValid);
    if (undefined !== this._program) {
      this._program.draw(params);
    }
  }
  public drawInterrupt(params: DrawParams) {
    assert(params.target === this._params.target);

    const tech = params.target.techniques.getTechnique(params.geometry.getTechniqueId(params.target));
    const program = tech.getShader(TechniqueFlags.defaults);
    if (this.setProgram(program)) {
      this.draw(params);
    }
  }

  private changeProgram(program?: ShaderProgram): boolean {
    if (this._program === program) {
      return true;
    } else if (undefined !== this._program) {
      this._program.endUse(this._params.context);
    }

    this._program = program;
    if (undefined !== program && !program.use(this._params)) {
      this._program = undefined;
      return false;
    }

    return true;
  }
}
