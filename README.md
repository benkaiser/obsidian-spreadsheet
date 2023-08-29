# Obsidian Spreadsheet Plugins

> Note: this plugin is currently limited to CSV files, but it does support formulas. I plan to add support for other spreadsheet formats in the future.

This plugin allows you to embed and edit spreadsheets in Obsidian.

To embed a CSV within your vault within a markdown file, simple use a custom fenced code block with the language set to `spreadsheet`:

````
```spreadsheet
[[My File.csv]]
```
````

You can also customize several options for the spreadsheet such as COLUMNS, ROWS and HEADER:


````
```spreadsheet
[[My File.csv]]
COLUMNS: A-C
ROWS: 4-10
HEADER: true
```
````