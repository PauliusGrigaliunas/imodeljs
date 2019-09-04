
/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
/** @module Tools */

import { IModelApp } from "../IModelApp";

/** Tool Assistance known images
 * @beta
 */
export enum ToolAssistanceImage {
  /** When Keyboard is specified, ToolAssistanceInstruction.keyboardInfo should be set. */
  Keyboard,
  /** Plus sign */
  AcceptPoint,
  /** Cursor image with click symbol */
  CursorClick,
  /** Mouse image with darkened left button */
  LeftClick,
  /** Mouse image with darkened right button */
  RightClick,
  /** Mouse image with darkened scroll wheel */
  MouseWheel,
  /** Mouse image with darkened left button and left/right arrows */
  LeftClickDrag,
  /** Mouse image with darkened right button and left/right arrows */
  RightClickDrag,
  /** Mouse image with darkened scroll wheel and left/right arrows */
  MouseWheelClickDrag,
  /** Touch image with single finger tapping once */
  OneTouchTap,
  /** Touch image with single finger tapping twice */
  OneTouchDoubleTap,
  /** Touch image with single finger dragging */
  OneTouchDrag,
  /** Touch image with two fingers tapping once */
  TwoTouchTap,
  /** Touch image with two fingers dragging */
  TwoTouchDrag,
  /** Touch image with two fingers pinching */
  TwoTouchPinch,
}

/** Input Method for Tool Assistance instruction
 * @beta
 */
export enum ToolAssistanceInputMethod {
  /** Instruction applies to both touch & mouse input methods */
  Both,
  /** Instruction applies to only mouse input method */
  Mouse,
  /** Instruction applies to only touch input method */
  Touch,
}

/** Tool Assistance image keyboard keys
 * @beta
 */
export interface ToolAssistanceKeyboardInfo {
  /** Text for keys to display */
  keys: string[];
  /** If two rows of keys should be displayed, text for the bottom row of keys */
  bottomKeys?: string[];
}

/** Interface used to describe a Tool Assistance instruction.
 * @beta
 */
export interface ToolAssistanceInstruction {
  /** Name of icon WebFont entry, or if specifying an SVG symbol, use "svg:" prefix to imported symbol Id.
   *  ToolAssistanceImage enum also supported. If ToolAssistanceImage.Keyboard specified, also provide keyboardInfo.
   */
  image: string | ToolAssistanceImage;
  /** Text for the instruction. */
  text: string;
  /** When ToolAssistanceImage.Keyboard is specified for image, information about the Keyboard keys in the image. */
  keyboardInfo?: ToolAssistanceKeyboardInfo;
  /** Indicates whether this instruction is new. Defaults to false. */
  isNew?: boolean;
  /** Input Method to which the instruction applies */
  inputMethod?: ToolAssistanceInputMethod;
}

/** Interface used to describe a Tool Assistance section with a label and a set of instructions.
 * @beta
 */
export interface ToolAssistanceSection {
  /** Instructions in the section. */
  instructions: ToolAssistanceInstruction[];
  /** Label for the section. */
  label?: string;
}

/** Interface used to describe Tool Assistance for a tool's state.
 * @beta
 */
export interface ToolAssistanceInstructions {
  /** The main instruction. */
  mainInstruction: ToolAssistanceInstruction;
  /** Sections of instructions. */
  sections?: ToolAssistanceSection[];
}

/** Tool Assistance helper methods.
 * @beta
 */
export class ToolAssistance {

  /** Up key symbol. */
  public static readonly upSymbol: string = "\u2bc5";
  /** Down key symbol. */
  public static readonly downSymbol: string = "\u2bc6";
  /** Left key symbol. */
  public static readonly leftSymbol: string = "\u2bc7";
  /** Right key symbol. */
  public static readonly rightSymbol: string = "\u2bc8";

  /** Keyboard info for Arrow keys. */
  public static readonly arrowKeyboardInfo: ToolAssistanceKeyboardInfo = {
    keys: [ToolAssistance.upSymbol],
    bottomKeys: [ToolAssistance.leftSymbol, ToolAssistance.downSymbol, ToolAssistance.rightSymbol],
  };

  /** Alt key text. */
  public static get altKey(): string {
    return IModelApp && IModelApp.i18n && IModelApp.i18n.translate("CoreTools:toolAssistance.altKey");
  }

  /** Ctrl key text. */
  public static get ctrlKey(): string {
    return IModelApp && IModelApp.i18n && IModelApp.i18n.translate("CoreTools:toolAssistance.ctrlKey");
  }

  /** Shift key text. */
  public static get shiftKey(): string {
    return IModelApp && IModelApp.i18n && IModelApp.i18n.translate("CoreTools:toolAssistance.shiftKey");
  }

  /** Inputs text. */
  public static get inputsLabel(): string {
    return IModelApp && IModelApp.i18n && IModelApp.i18n.translate("CoreTools:toolAssistance.inputs");
  }

  /** Keyboard info for Alt key. */
  public static get altKeyboardInfo(): ToolAssistanceKeyboardInfo {
    return { keys: [ToolAssistance.altKey] };
  }

  /** Keyboard info for Ctrl key. */
  public static get ctrlKeyboardInfo(): ToolAssistanceKeyboardInfo {
    return { keys: [ToolAssistance.ctrlKey] };
  }

  /** Shift key symbol. */
  public static readonly shiftSymbol: string = "\u21e7";

  /** Keyboard info for Shift key with symbol. */
  public static get shiftKeyboardInfo(): ToolAssistanceKeyboardInfo {
    return { keys: [`${ToolAssistance.shiftSymbol} ${ToolAssistance.shiftKey}`] };
  }

  /** Keyboard info for Shift key without symbol. */
  public static get shiftKeyboardInfoNoSymbol(): ToolAssistanceKeyboardInfo {
    return { keys: [ToolAssistance.shiftKey] };
  }

  /** Keyboard info for Shift key symbol. */
  public static get shiftSymbolKeyboardInfo(): ToolAssistanceKeyboardInfo {
    return { keys: [` ${ToolAssistance.shiftKey} `] };
  }

  /** Creates a [[ToolAssistanceInstruction]].
   */
  public static createInstruction(image: string | ToolAssistanceImage, text: string, isNew?: boolean, inputMethod?: ToolAssistanceInputMethod, keyboardInfo?: ToolAssistanceKeyboardInfo): ToolAssistanceInstruction {
    if (inputMethod === undefined)
      inputMethod = ToolAssistanceInputMethod.Both;

    const instruction: ToolAssistanceInstruction = {
      image,
      text,
      keyboardInfo,
      isNew,
      inputMethod,
    };
    return instruction;
  }

  /** Creates a [[ToolAssistanceInstruction]] with a [[ToolAssistanceKeyboardInfo]].
   */
  public static createKeyboardInstruction(keyboardInfo: ToolAssistanceKeyboardInfo, text: string, isNew?: boolean, inputMethod?: ToolAssistanceInputMethod): ToolAssistanceInstruction {
    if (inputMethod === undefined)
      inputMethod = ToolAssistanceInputMethod.Mouse;

    const instruction: ToolAssistanceInstruction = {
      image: ToolAssistanceImage.Keyboard,
      text,
      keyboardInfo,
      isNew,
      inputMethod,
    };
    return instruction;
  }

  /** Creates a [[ToolAssistanceKeyboardInfo]].
   */
  public static createKeyboardInfo(keys: string[], bottomKeys?: string[]): ToolAssistanceKeyboardInfo {
    const keyboardInfo: ToolAssistanceKeyboardInfo = {
      keys,
      bottomKeys,
    };
    return keyboardInfo;
  }

  /** Creates a [[ToolAssistanceSection]].
   */
  public static createSection(instructions: ToolAssistanceInstruction[], label?: string): ToolAssistanceSection {
    const section: ToolAssistanceSection = {
      instructions,
      label,
    };
    return section;
  }

  /** Creates a [[ToolAssistanceInstructions]].
   */
  public static createInstructions(mainInstruction: ToolAssistanceInstruction, sections?: ToolAssistanceSection[]): ToolAssistanceInstructions {
    const instructions: ToolAssistanceInstructions = {
      mainInstruction,
      sections,
    };
    return instructions;
  }
}
