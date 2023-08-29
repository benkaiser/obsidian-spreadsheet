import { App, EditableFileView, Editor, MarkdownPostProcessorContext, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TextFileView, WorkspaceLeaf, addIcon, getFirstLinkpathDest } from 'obsidian';
import jspreadsheet, { JspreadsheetInstance, Row } from 'jspreadsheet-ce';

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

		this.registerMarkdownCodeBlockProcessor("spreadsheet", this.csvEmbedCreator)
	}

	// function to create the view
  csvViewCreator = (leaf: WorkspaceLeaf) => {
    return new CsvView(leaf);
  }

	csvEmbedCreator = (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
		const rows = source.split("\n").filter((row) => row.length > 0);
		let filePath = rows[0];
		filePath = filePath.substring(2, filePath.length - 2);
		filePath = filePath.split('|')[0];
		const resolvedFile = this.app.metadataCache.getFirstLinkpathDest(filePath, ctx.sourcePath);
		const options: IRenderOptions = {};
		/**
		 * Available options
		 *	ROWS: 12-12
		 *	COLUMNS: A-F
		 *	HEADER: true
		 */
		for (let i = 1; i < rows.length; i++) {
			const row = rows[i];
			const [key, value] = row.split(":");
			if (key && value) {
				options[key.trim() as keyof IRenderOptions] = value.trim();
			}
		}
		if (resolvedFile) {
			this.app.vault.cachedRead(resolvedFile).then((data) => {
				renderCSV(el, data, options);
			});
		} else {
			el.innerHTML = "File not found";
		}
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

interface IRenderOptions {
	ROWS?: string;
	COLUMNS?: string;
	HEADER?: string;
}

function renderCSV(el: HTMLElement, data: string, options: IRenderOptions) {
	const containerDiv = document.createElement("div");
	containerDiv.id = "spreadsheet";
	el.appendChild(containerDiv);
	const parsedCSVData: string[][] = jspreadsheet.helpers.parseCSV(data);
	const headerRow = parsedCSVData[0];
	const rows: Row[] = Array.from({ length: parsedCSVData.length }, (_, i) => ({ title: String(i + 1) }));
	if (options.HEADER === 'true') {
		parsedCSVData.splice(0, 1);
		rows.splice(0, 1);
	}
	// options.ROWS = "12-12"; If this is a range, then we need the cells in that range. If it is a single value then we need all rows up to that number.
	if (options.ROWS) {
		let [start, end] = options.ROWS.split("-").map((value) => parseInt(value));
		if (options.HEADER === 'true') {
			start--;
			end--;
		}
		if (end) {
			parsedCSVData.splice(end);
			parsedCSVData.splice(0, start - 1);
			rows.splice(end);
			rows.splice(0, start - 1);
		} else {
			parsedCSVData.splice(start);
		}
	}
	// options.COLUMNS = "A-Z"; If this is a range, then we need the cells in that range. If it is a single value then only include that column.
	if (options.COLUMNS) {
		let [start, end] = options.COLUMNS.split("-").map((value) => value.charCodeAt(0) - 65);
		if (end) {
			// end is inclusive
			end++;
			parsedCSVData.forEach((row) => {
				row.splice(end);
				row.splice(0, start);
			});
			headerRow.splice(end);
			headerRow.splice(0, start);
		} else {
			// only select the specific column at `start` index
			parsedCSVData.forEach((row) => {
				row.splice(start + 1);
				row.splice(0, start);
			});
			headerRow.splice(start + 1);
			headerRow.splice(0, start);
		}
	}

	this._spreadSheet = jspreadsheet(containerDiv, {
		about: false,
		columnSorting: false,
		...(options.HEADER === "true" ? { columns: headerRow.map(column => ({ title: column })) } : {}),
		rows,
		data: parsedCSVData,
		defaultColWidth: 120,
		defaultRowHeight: 24,
		editable: false
	});
}

class CsvView extends TextFileView {
	private _data: string;
	private _spreadSheet: JspreadsheetInstance;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		const containerDiv = document.createElement("div");
		containerDiv.id = "spreadsheet";
		this.contentEl.appendChild(containerDiv);
		this._spreadSheet = jspreadsheet(containerDiv, {
			about: false,
			minSpareCols: 12,
			minSpareRows: 12,
			defaultColWidth: 120,
			defaultRowHeight: 24,
			columnSorting: false,
			onafterchanges: () => {
				this.requestSave();
			}
		});

	}

	getViewData(): string {
		const rawData: any[][] = this._spreadSheet.getData();
		// find furtherst right and down cell with data
		let maxRow = 0;
		let maxCol = 0;
		for (let i = 0; i < rawData.length; i++) {
			for (let j = 0; j < rawData[i].length; j++) {
				if (rawData[i][j]) {
					maxRow = Math.max(maxRow, i);
					maxCol = Math.max(maxCol, j);
				}
			}
		}
		const trimmedData = rawData.slice(0, maxRow + 1).map((row) => row.slice(0, maxCol + 1));
		const trimmedDataFinal = trimmedData.map((row) => row.map((cell) => cell || ""));
		// convert 2d array to csv string, making sure to wrap cells with commas in quotes
		const csvString = trimmedDataFinal.map((row) => row.map((cell) => {
			if (cell.includes(",")) {
				return `"${cell}"`;
			} else {
				return cell;
			}
		}).join(",")).join("\n");
		return csvString;
	}

	setViewData(data: string, clear: boolean): void {
		this._data = data;
		const parsedCSVData: string[][] = this._spreadSheet.parseCSV(data as unknown as number);
		this._spreadSheet.setData(parsedCSVData);
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