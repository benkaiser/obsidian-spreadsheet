import { App, EditableFileView, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TextFileView, WorkspaceLeaf, addIcon } from 'obsidian';
import jspreadsheet, { JspreadsheetInstance } from 'jspreadsheet-ce';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

    // register a custom icon
    this.addDocumentIcon();

		this.registerView("csv", this.csvViewCreator);
    this.registerExtensions(["csv"], "csv");
	}

	// function to create the view
  csvViewCreator = (leaf: WorkspaceLeaf) => {
    return new CsvView(leaf);
  }

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private addDocumentIcon() {
		addIcon(`document-spreadsheet`, `
  <path fill="currentColor" stroke="currentColor" d="M14,4v92h72V29.2l-0.6-0.6l-24-24L60.8,4L14,4z M18,8h40v24h24v60H18L18,8z M62,10.9L79.1,28H62V10.9z"></path>
  <text font-family="sans-serif" font-weight="bold" font-size="30" fill="currentColor" x="50%" y="60%" dominant-baseline="middle" text-anchor="middle">
    csv
  </text>
    `);
	}
}

class CsvView extends TextFileView {
	private _data: string;
	private _spreadSheet: JspreadsheetInstance;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		const containerDiv = document.createElement("div");
		containerDiv.id = "spreadsheet";
		this.contentEl.appendChild(containerDiv);
		this._spreadSheet = jspreadsheet(containerDiv, { about: false, minSpareCols: 2, minSpareRows: 2 });

	}

	getViewData(): string {
		return this._data;
		throw new Error('Method not implemented.');
	}
	setViewData(data: string, clear: boolean): void {
		this._data = data;
		const parsedCSVData: string[][] = this._spreadSheet.parseCSV(data as unknown as number);
		this._spreadSheet.setData(parsedCSVData);
		// this._spreadSheet.setData(data);
	}
	clear(): void {

	}
	getViewType(): string {
		return "csv";
	}

	// icon for the view
  getIcon() {
    return "document-spreadsheet";
  }
}