import * as vscode from "vscode";
import ContentProvider from "./ContentProvider";
import { resolve } from "path";
import Manager from "./Manager";

export function activate(context: vscode.ExtensionContext) {
  const contentProvider = new ContentProvider();

  let disposable = vscode.commands.registerCommand("charm.showPanel", () => {
    const panel = vscode.window.createWebviewPanel(
      "charm",
      "Fabulous",
      vscode.ViewColumn.Two,
      {
        enableScripts: true
      }
    );

    panel.webview.html = contentProvider.getContent(context);
    panel.iconPath = {
      dark: vscode.Uri.file(resolve("../icons/brush.svg")),
      light: vscode.Uri.file(resolve("../icons/brush.svg"))
    };

    const manager = new Manager(panel);

    panel.webview.onDidReceiveMessage(
      message => {
        manager.updateActiveBlock(message.prop, message.value);
      },
      undefined,
      context.subscriptions
    );
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
