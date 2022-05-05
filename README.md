## Installation

```bash
$ npm install --save-dev ts-esm-rename
```


## Usage

```bash
$ ts-esm-rename --target lib/esm --regex-import-statement \"^\\s*(import|export)\\s{1,}(.*)\\s{1,}from\\s{1,}(\\\"|')(\\.{1,2}\\/.*)(\\\"|');?\\s*$\" --regex-filename \"\\.js\"
```