# copy-pasta-comparator

Sometimes you need to `copy-n-paste` some code around.
I have a use-case where we create a new version of our configuration this way. We know about version control, but for our use-case, it makes sense to copy-n-paste.

## Compile it

```shell
npm install
npm run package
```

## Use it

* in VSCode, go to Extensions
* click the additional menu `Views and More Actions...`
* click `Install from VSIX`
* point it to your newly packaged `copy-pasta...vsix`
* done (you might need to reload your window though 🤷)

## Uninstall it

* go to Extensions
* search for `copy-pasta`
* click on the settings menu item
* uninstall it
