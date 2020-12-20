# CHIIR 2021: The Effect of Nudges and Boosts on Browsing Privacy in a Naturalistic Environment

This repository contains the code necessary to replicate the experiment described in our publication, as well as the utilized questionnaires. The backend was a django powered API with a postgresql database and code can be found at *backend*. The frontend was implemented as a web extension for Chrome and Firefox and its code is at *extension/extension_English* for the English version and *extension/extension_German* for the German version respectively. The German version was used in the study, but both merely differ in the language of the user interface.

## Citation
Please use the following bibtex and the information therein for citation. 

```
@inproceedings{Ortloff2021BrowsingPrivacy,
 author = {Ortloff, A.-M. and Zimmerman, S. and Elsweiler, D. and Henze, N.},
 title = {The Effect of Nudges and Boosts on Browsing Privacy in a Naturalistic Environment},
 booktitle = {Proceedings of the 2021 Conference on Human Information Interaction and Retrieval},
 series = {CHIIR '21},
 year = {2021},
 location = {online},
} 
```

## Boosts and Nudges

Boosts were evaluated using an online questionnaire and then five of them were used in a naturalistic experiment. All boosts and the study phases in which they were used can be found at *boosts*.

Five different kind of nudges were generated from participant data during the study. Phrasing of nudges and their composition are at *nudges*

## Questionnaires

Questionnaires used in both studys can be found at *questionnaires*

## Usage
The code given is anonymized in that it does not contain passwords/keys to access services ... To use it: 

Replace placeholders in the code with your own values. You will need access to the Webshrinker service to categorize URLs. For the backend, places to adjust are marked with ```# TODO change with own data``` in the Python code. For the frontend there are also ```TODO change with own data``` comments both in the .js and in html files. 
Replace values in the extension (periods of study phases, paths).

Set up backend with data base according to standard Django procedure.

Install extension on Firefox using the xpi given at *extension/extension_German/browsing_studie-1.6-fx.xpi* if wanting to test the extension as it was used during the study. Due to anonymisation of extension code and because the subscription to webservices used for site categorization has expired, this has limited functionality. If you change the extension (and backend) code to include your own versions of access keys, this changed version of the extension can be installed on Chrome using the developer options with the given code and on Firefox using the Add-ons Manager's debug options.

## License

MIT License

Copyright (c) 2021 Anna-Marie Ortloff

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.







