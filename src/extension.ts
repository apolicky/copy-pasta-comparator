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

    const vscodeUri = (file: string) => {
        if (file === "untitled:empty") {
            return vscode.Uri.parse(file);
        }
        return vscode.Uri.file(file);
    };

    const fileNameAndType = (oldFile: string, newFile: string) => {
        if (oldFile === "untitled:empty") {
            return { nameToShow: newFile, type: "created" };
        } else if (newFile === "untitled:empty") {
            return { nameToShow: oldFile, type: "deleted" };
        }
        return { nameToShow: oldFile, type: "old ⟷ new" };
    };

    type OpenDiffProps = { oldFile: string; newFile: "untitled:empty" } | { oldFile: string; newFile: string } | { oldFile: "untitled:empty"; newFile: string };
    const openDiff = (props: OpenDiffProps) => {
        const { oldFile, newFile } = props;
        const oldFileUri = vscodeUri(oldFile);
        const newFileUri = vscodeUri(newFile);

        const { nameToShow, type } = fileNameAndType(oldFile, newFile);

        vscode.commands.executeCommand("vscode.diff", oldFileUri, newFileUri, `${path.basename(nameToShow)} (${type})`, {
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

        for (const oldFile of oldFiles) {
            const newFile = newFiles.find((f) => path.basename(f) === path.basename(oldFile));
            if (!newFile) {
                openDiff({ oldFile, newFile: "untitled:empty" });
            } else {
                openDiff({ oldFile, newFile });
            }
        }
        for (const newFile of newFiles.filter((f) => !oldFilesNames.includes(path.basename(f)))) {
            openDiff({ oldFile: "untitled:empty", newFile });
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
