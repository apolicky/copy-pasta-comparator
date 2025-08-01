import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export function activate(context: vscode.ExtensionContext) {
    const getAllDirsOrFiles = (dir: string, type: "dir" | "file"): string[] => {
        const dirsOrFiles = fs
            .readdirSync(dir)
            .map((file) => {
                const filePath = path.join(dir, file);
                const isDirectory = fs.statSync(filePath).isDirectory();
                if (isDirectory && type === "dir") {
                    return filePath;
                } else if (!isDirectory && type === "file") {
                    return filePath;
                }
                return null;
            })
            .filter((e): e is string => e !== null);
        return dirsOrFiles;
    };

    const openDiff = (oldFile: string, newFile?: string, type: "old ⟷ new" | "only new" | "only old" = "old ⟷ new") => {
        const oldFileUri = vscode.Uri.file(oldFile);
        const newFileUri = newFile ? vscode.Uri.file(newFile) : newFile;

        vscode.commands.executeCommand("vscode.diff", oldFileUri, newFileUri, `${path.basename(oldFile)} (${type})`, {
            preview: false,
            viewColumn: vscode.ViewColumn.Two,
        });
    };

    const getOldAndNewVersionFolders = async (newVersionFolder: string, oldVersion: "previous" | "askForIt") => {
        let prevVersion: string | undefined;
        if (oldVersion === "previous") {
            const parentFolder = path.dirname(newVersionFolder);

            const allVersions = getAllDirsOrFiles(parentFolder, "dir");
            const prevVersions = allVersions.slice(0, allVersions.indexOf(newVersionFolder));
            prevVersion = prevVersions.pop();
        } else if (oldVersion === "askForIt") {
            const oldVersionUri = await vscode.window.showOpenDialog({
                canSelectFolders: true,
                canSelectFiles: false,
                canSelectMany: false,
                openLabel: "Select the other version",
            });

            if (oldVersionUri) {
                prevVersion = oldVersionUri[0].fsPath;
            }
        } else {
            throw new Error(`Unexpected argument 'oldVersion': ${oldVersion}`);
        }

        if (!prevVersion) {
            throw new Error("No folder found for previous version");
        }
        return prevVersion;
    };

    const compareFolders = (prevVersion: string, newVersionFolder: string) => {
        const oldFiles = getAllDirsOrFiles(prevVersion, "file");
        const newFiles = getAllDirsOrFiles(newVersionFolder, "file");
        const oldFilesNames = oldFiles.map((f) => path.basename(f));

        // Step 4: Map files by relative path and show diffs
        for (const oldFile of oldFiles) {
            const newFile = newFiles.find((f) => path.basename(f) === path.basename(oldFile));
            if (!newFile) {
                openDiff(oldFile, oldFile, "only old");
            } else {
                openDiff(oldFile, newFile);
            }
        }
        for (const newFile of newFiles.filter((f) => !oldFilesNames.includes(path.basename(f)))) {
            openDiff(newFile, newFile, "only new");
        }
    };

    let compareToPrevious = vscode.commands.registerCommand("copy-pasta-comparator.compareToPrevious", async (uri: vscode.Uri) => {
        const newVersionFolder = uri.fsPath;
        const prevVersion = await getOldAndNewVersionFolders(newVersionFolder, "previous");
        compareFolders(prevVersion, newVersionFolder);
    });

    let compareToAnother = vscode.commands.registerCommand("copy-pasta-comparator.compareToSomeOther", async (uri: vscode.Uri) => {
        const newVersionFolder = uri.fsPath;
        const prevVersion = await getOldAndNewVersionFolders(newVersionFolder, "askForIt");
        compareFolders(prevVersion, newVersionFolder);
    });

    context.subscriptions.push(compareToPrevious);
    context.subscriptions.push(compareToAnother);
}
