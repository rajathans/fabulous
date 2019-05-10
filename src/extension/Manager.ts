import * as vscode from "vscode";
import { EditableBlock } from "./inspector/utils";
import { Inspector } from "./inspector/inspector";
import CSSFileInspector from "./inspector/css-handler";
import StyledComponentsInspector from "./inspector/styled-components-handler";

export default class Manager {
  private activeEditor: vscode.TextEditor | undefined;
  private panel: vscode.WebviewPanel;
  private activeBlock: EditableBlock | undefined;
  private cursorPosion: vscode.Position | undefined;
  private inspector: Inspector | undefined;

  constructor(panel: vscode.WebviewPanel) {
    this.panel = panel;

    vscode.window.onDidChangeActiveTextEditor(activeEditor => {
      if (activeEditor && activeEditor.document.languageId === "css") {
        this.inspector = CSSFileInspector;
        this.activeEditor = activeEditor;
      } else if (
        activeEditor &&
        activeEditor.document.languageId === "javascript"
      ) {
        this.inspector = StyledComponentsInspector;
        this.activeEditor = activeEditor;
      }
    });

    vscode.workspace.onDidChangeTextDocument(({ document }) => {
      if (document.languageId === "css") {
        this.parseFromActiveEditor();
      } else if (document.languageId === "javascript") {
        this.parseFromActiveEditor();
      }
    });

    vscode.window.onDidChangeTextEditorSelection(({ textEditor }) => {
      if (textEditor && textEditor.document.languageId === "css") {
        this.activeEditor = textEditor;
        this.parseFromActiveEditor();
      } else if (
        textEditor &&
        textEditor.document.languageId === "javascript"
      ) {
        this.activeEditor = textEditor;
        this.parseFromActiveEditor();
      }
    });
  }

  parseFromActiveEditor() {
    if (this.activeEditor) {
      const activeFileContent = this.activeEditor.document.getText();
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const payload = this.getPayloadForBlock(
          activeFileContent,
          editor.selection.active
        );
        this.panel.webview.postMessage(payload);
        this.cursorPosion = editor.selection.active;
      }
    }
  }

  getPayloadForBlock(
    activeFileContent: string,
    cursorPosition: vscode.Position
  ) {
    let payload = {};
    if (this.inspector) {
      const blocks = this.inspector.getEdiableBlocks(activeFileContent);
      const activeBlock = this.getActiveBlock(cursorPosition, blocks);
      this.activeBlock = activeBlock;
      if (activeBlock) {
        payload = activeBlock.declarations.reduce((prev: any, declaration) => {
          prev[declaration.prop] = declaration.value;
          return prev;
        }, {});
      }
    }
    return payload;
  }

  getActiveBlock(cursorPositon: vscode.Position, blocks: EditableBlock[]) {
    return blocks.find(({ source }) => {
      const ruleStartPosition = new vscode.Position(
        (source && source.start && source.start.line) || 0,
        (source && source.start && source.start.column) || 0
      );

      const ruleEndPosition = new vscode.Position(
        (source && source.end && source.end.line) || 0,
        (source && source.end && source.end.column) || 0
      );

      return this.isCursorWithinBlock(
        ruleStartPosition,
        ruleEndPosition,
        cursorPositon
      );
    });
  }

  isCursorWithinBlock(
    ruleStart: vscode.Position,
    ruleEnd: vscode.Position,
    cursorPosition: vscode.Position
  ) {
    return (
      cursorPosition.isAfterOrEqual(ruleStart) &&
      cursorPosition.isBeforeOrEqual(ruleEnd)
    );
  }

  updateActiveBlock(prop: string, value: string) {
    if (this.activeBlock && this.inspector) {
      const updatedCSS = this.inspector.updateProperty(
        this.activeBlock,
        prop,
        value
      );
      if (this.activeEditor) {
        const source = this.activeBlock.source;
        const ruleStartPosition = new vscode.Position(
          (source && source.start && source.start.line - 1) || 0,
          (source && source.start && source.start.column - 1) || 0
        );

        const ruleEndPosition = new vscode.Position(
          (source && source.end && source.end.line - 1) || 0,
          (source && source.end && source.end.column) || 0
        );

        this.activeEditor
          .edit(editBuilder => {
            editBuilder.replace(
              new vscode.Range(ruleStartPosition, ruleEndPosition),
              updatedCSS
            );
          })
          .then(() => {
            if (this.activeEditor && this.cursorPosion && this.inspector) {
              const activeFileContent = this.activeEditor.document.getText();
              const blocks = this.inspector.getEdiableBlocks(activeFileContent);
              const activeRule = this.getActiveBlock(this.cursorPosion, blocks);
              this.activeBlock = activeRule;
            }
          });
      }
    }
  }
}
