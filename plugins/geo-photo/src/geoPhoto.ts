/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/

import { IModelApp, IModelConnection, Plugin, ScreenViewport, Tool, AuthorizedFrontendRequestContext } from "@bentley/imodeljs-frontend";
import { I18NNamespace } from "@bentley/imodeljs-i18n";
import { GeoPhotoMarkerManager } from "./geoPhotoMarker";
import { PhotoTreeHandler, PhotoFolder, PhotoTraverseFunction } from "./PhotoTree";
import { ProjectShareHandler } from "./ProjectSharePhotoTree";

/*-----------------------------------------------------------------------
This is the source for an iModel.js Plugin that displays on-screen markers
at the latitude and longitude of geoLocated panoramic photographs.

When such a marker is clicked, the corresponding panorama is opened in a
separate tab. Depending on the browser, you may have to grant permission
for such a tab to be opened.

iModel.js Plugins are javascript fragments that can be loaded at runtime
into an appropriately configured browser or Electron process.
-------------------------------------------------------------------------*/

/* ----------------------- The top level container class that holds the tree of photos --------------------- */
/** The container class for the GeoPhoto tree and associated Markers */
export class GeoPhotos {
  public rootFolder: PhotoFolder | undefined;
  private _markers: GeoPhotoMarkerManager | undefined;

  /** Constructs GeoPhotos container. Specify the tree handler to access the storage mechanism.
   * The GeoPhotos container is stored on the associated IModelConnection object.
   */
  constructor(public plugin: GeoPhotoPlugin, public treeHandler: PhotoTreeHandler, public iModel: IModelConnection) {
    this.rootFolder = undefined;
    this._markers = undefined;
    (iModel as any).geoPhotos = this;
    IModelConnection.onClose.addListener(this.onCloseIModel.bind(this));
  }

  /** Uses the tree handler to read the folders and files in the tree */
  public async readTreeContents(): Promise<void> {
    // readRootFolder reads the folder.
    this.rootFolder = await this.treeHandler.createRootFolder();
    await this.treeHandler.getCartographicPositions(this.rootFolder, true);
    await this.treeHandler.getSpatialPositions(this.rootFolder, true);
  }

  /** Traverse the tree, calling the func for each PhotoFile. */
  public async traverseTree(func: PhotoTraverseFunction, visibleOnly: boolean) {
    if (this.rootFolder)
      await this.rootFolder.traversePhotos(func, true, visibleOnly);
  }

  /** Creates a GeoPhotoMarkerManager to display markers for each photo. */
  public showMarkers() {
    if (!this._markers) {
      this._markers = new GeoPhotoMarkerManager(this.plugin, this);
    }
    this._markers.startDecorating().catch((_err) => { });
  }

  /** Stops drawing and discards the photo markers. */
  public removeMarkers() {
    if (this._markers) {
      this._markers.stopDecorating();
      this._markers = undefined;
    }
  }

  /** callback for iModel closed - removes the markers. */
  private onCloseIModel(iModel: IModelConnection) {
    if (this.iModel === iModel) {
      this.removeMarkers();
      (iModel as any).geoPhotos = undefined;
    }
  }

  /** Returns true if currently displaying markers. */
  public showingMarkers(): boolean {
    return (undefined !== this._markers) && this._markers.nowDecorating();
  }
}

/** An Immediate Tool that can be used to execute the operations in GeoPhotoPlugin. */
class GeoTagTool extends Tool {
  public static toolId = "GeoTagTool";
  public static plugin: GeoPhotoPlugin | undefined;
  public static get maxArgs() { return 1; }
  public static get minArgs() { return 0; }
  public parseAndRun(...args: string[]): boolean {
    return this.run(args);
  }

  public run(args: any[]): boolean {
    // the plugin does the actual work.
    if (IModelApp.viewManager.selectedView) {
      if ((undefined === args) || args.length < 1)
        args = ["toggle"];
      GeoTagTool.plugin!.onExecute(args);
    }
    return true;
  }
}

/** the show/hide/toggle operations */
const enum Operation {
  Hide = 0,
  Show = 1,
  Toggle = 2,
}

/** The plugin class that is instantiated when the plugin is loaded, and executes the operations */
class GeoPhotoPlugin extends Plugin {
  private _i18NNamespace?: I18NNamespace;

  // displays the GeoPhoto markers for the specified iModel.
  public async showGeoPhotoMarkers(iModel: IModelConnection): Promise<void> {
    let geoPhotos: GeoPhotos = (iModel as any).geoPhotos;
    if (undefined === geoPhotos) {
      const requestContext = await AuthorizedFrontendRequestContext.create();
      const treeHandler = new ProjectShareHandler(requestContext, this.i18n, iModel);
      geoPhotos = new GeoPhotos(this, treeHandler!, iModel);
      await geoPhotos.readTreeContents();
    }
    geoPhotos.showMarkers();
  }

  /** displays the GeoPhoto markers for the specified iModel. */
  public hideGeoPhotoMarkers(iModel: IModelConnection): void {
    const geoPhotos: GeoPhotos = (iModel as any).geoPhotos;
    if (undefined !== geoPhotos)
      geoPhotos.removeMarkers();
  }

  // interprets the argument
  private getOperation(arg: string): Operation {
    arg = arg.toLocaleLowerCase();
    if ((arg === "1") || (arg === "on") || (arg === "show"))
      return Operation.Show;
    else if ((arg === "0") || (arg === "off") || (arg === "hide"))
      return Operation.Hide;
    else
      return Operation.Toggle;
  }

  private showingMarkers(view: ScreenViewport) {
    const geoPhotos: GeoPhotos = (view.iModel as any).geoPhotos;
    return (geoPhotos && geoPhotos.showingMarkers());
  }

  /** Invoked the first time this plugin is loaded. */
  public onLoad(_args: string[]): void {
    // store the plugin in the tool prototype.
    GeoTagTool.plugin = this;

    this._i18NNamespace = this.i18n.registerNamespace("geoPhoto");
    this._i18NNamespace!.readFinished.then(() => {
      IModelApp.tools.register(GeoTagTool, this._i18NNamespace, this.i18n);
      GeoTagTool.plugin = this;
    }).catch(() => { });
  }

  /** Invoked each time this plugin is loaded. */
  public onExecute(args: string[]): void {
    // if no args passed in, don't do anything.
    if (args.length < 1)
      return;

    const view = IModelApp.viewManager.selectedView;
    if (!view)
      return;

    const operation = this.getOperation(args[0]);

    if ((Operation.Show === operation) || ((Operation.Toggle === operation) && !this.showingMarkers(view)))
      this.showGeoPhotoMarkers(view.iModel).catch((_err) => { });
    else if ((Operation.Hide === operation) || ((Operation.Toggle === operation) && this.showingMarkers(view)))
      this.hideGeoPhotoMarkers(view.iModel);
  }
}

// This variable is set by webPack when building a plugin.
declare var PLUGIN_NAME: string;

// Register the plugin with the pluginAdmin.
IModelApp.pluginAdmin.register(new GeoPhotoPlugin(PLUGIN_NAME));
