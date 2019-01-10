/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
/** @module RpcInterface */

import { RpcRequest } from "../core/RpcRequest";
import { SerializedRpcRequest, SerializedRpcOperation } from "../core/RpcProtocol";
import { RpcInvocation } from "../core/RpcInvocation";
import { WebAppRpcRequest } from "./WebAppRpcRequest";
import { Logger } from "@bentley/bentleyjs-core";
import { RpcInterfaceDefinition } from "../../RpcInterface";
import { RpcProtocolEvent } from "../core/RpcConstants";
import { RpcOperation } from "../core/RpcOperation";

const loggingCategory = "imodeljs-rpc.WebAppRpcProtocol";

// tslint:disable-next-line:no-var-requires
const os = (typeof (process) !== "undefined") ? require("os") : undefined;
function getHostname(): string {
  if (os !== undefined) {
    return os.hostname();
  } else {
    if (typeof (window) !== "undefined") {
      return window.location.host;
    } else {
      return "imodeljs-mobile";
    }
  }
}

/** @hidden */
export class WebAppRpcLogging {
  public static logProtocolEvent(event: RpcProtocolEvent, object: RpcRequest | RpcInvocation): void {
    if (object instanceof WebAppRpcRequest) {
      switch (event) {
        case RpcProtocolEvent.RequestCreated: return WebAppRpcLogging.logRequest("RpcInterface.frontend.request", object);
        case RpcProtocolEvent.ResponseLoaded: return WebAppRpcLogging.logResponse("RpcInterface.frontend.response", object, object.metadata.status, object.elapsed);
        case RpcProtocolEvent.ConnectionErrorReceived: return WebAppRpcLogging.logErrorFrontend("RpcInterface.frontend.connectionError", object);
        case RpcProtocolEvent.ConnectionAborted: return WebAppRpcLogging.logErrorFrontend("RpcInterface.frontend.connectionAborted", object);
      }
    } else if (object instanceof RpcInvocation) {
      switch (event) {
        case RpcProtocolEvent.RequestReceived: return WebAppRpcLogging.logRequest("RpcInterface.backend.request", object.request);
        case RpcProtocolEvent.BackendErrorOccurred: return WebAppRpcLogging.logErrorBackend("RpcInterface.backend.error", object);
        case RpcProtocolEvent.BackendResponseCreated: return WebAppRpcLogging.logResponse("RpcInterface.backend.response", object.request, object.status, object.elapsed);
      }
    }
  }

  private static getRpcInterfaceName(g: string | RpcInterfaceDefinition): string {
    return (typeof g === "string") ? g : g.name;
  }

  private static findPathIds(path: string) {
    let contextID = "";
    let imodelID = "";

    const tokens = path.split("/");
    for (let i = 0; i !== tokens.length; ++i) {
      if ((/^context$/i).test(tokens[i])) {
        contextID = tokens[i + 1] || "";
      }

      if ((/^imodel$/i).test(tokens[i])) {
        imodelID = tokens[i + 1] || "";
      }
    }

    return { contextID, imodelID };
  }

  private static buildOperationDescriptor(operation: RpcOperation | SerializedRpcOperation): string {
    const interfaceName = typeof (operation.interfaceDefinition) === "string" ? operation.interfaceDefinition : operation.interfaceDefinition.name;
    const operationName = operation.operationName;
    return `${interfaceName}.${operationName}`;
  }

  public static logRequest(message: string, object: WebAppRpcRequest | SerializedRpcRequest): void {
    const operationDescriptor = WebAppRpcLogging.buildOperationDescriptor(object.operation);
    const { contextID, imodelID } = WebAppRpcLogging.findPathIds(object.path);

    Logger.logTrace(loggingCategory, `${message}.${operationDescriptor}`, () => ({
      method: object.method,
      path: object.path,
      operation: object.operation.operationName,
      rpcInterface: WebAppRpcLogging.getRpcInterfaceName(object.operation.interfaceDefinition),
      // Alert! The following properties are required by Bentley DevOps standards. Do not change their names!
      ActivityId: object.id,
      TimeElapsed: ("elapsed" in object) ? object.elapsed : 0,
      MachineName: getHostname(),
      contextID,
      imodelID,
    }));
  }

  private static logResponse(message: string, object: WebAppRpcRequest | SerializedRpcRequest, status: number, elapsed: number): void {
    const operationDescriptor = WebAppRpcLogging.buildOperationDescriptor(object.operation);
    const { contextID, imodelID } = WebAppRpcLogging.findPathIds(object.path);

    Logger.logTrace(loggingCategory, `${message}.${operationDescriptor}`, () => ({
      method: object.method,
      path: object.path,
      operation: object.operation.operationName,
      rpcInterface: WebAppRpcLogging.getRpcInterfaceName(object.operation.interfaceDefinition),
      status,
      // Alert! The following properties are required by Bentley DevOps standards. Do not change their names!
      ActivityId: object.id,
      TimeElapsed: elapsed,
      MachineName: getHostname(),
      contextID,
      imodelID,
    }));
  }

  private static logErrorFrontend(message: string, request: WebAppRpcRequest): void {
    const operationDescriptor = WebAppRpcLogging.buildOperationDescriptor(request.operation);
    const { contextID, imodelID } = WebAppRpcLogging.findPathIds(request.path);

    Logger.logInfo(loggingCategory, `${message}.${operationDescriptor}`, () => ({
      method: request.method,
      path: request.path,
      // Alert! The following properties are required by Bentley DevOps standards. Do not change their names!
      ActivityId: request.id,
      MachineName: getHostname(),
      contextID,
      imodelID,
    }));
  }

  private static logErrorBackend(message: string, invocation: RpcInvocation): void {
    const operationDescriptor = WebAppRpcLogging.buildOperationDescriptor(invocation.operation);
    const { contextID, imodelID } = WebAppRpcLogging.findPathIds(invocation.request.path);

    Logger.logInfo(loggingCategory, `${message}.${operationDescriptor}`, () => ({
      method: invocation.request.method,
      path: invocation.request.path,
      status: invocation.status,
      error: invocation.result,
      // Alert! The following properties are required by Bentley DevOps standards. Do not change their names!
      ActivityId: invocation.request.id,
      MachineName: getHostname(),
      contextID,
      imodelID,
    }));
  }
}
