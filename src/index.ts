import {
    IEventBusMap,
    Plugin,
} from "siyuan";
import "@/index.scss";

const path = window.require("path");
const fs = window.require("fs");

import { SettingUtils } from "./libs/setting-utils";

const STORAGE_NAME = "store.json";

const useLocalLogFile = () => {

    if (!fs || !path) {
        console.warn("fs or path is not defined; can not run file logging");
        return {
            appendFile: () => { },
            filePath: '',
        };
    }

    const workspaceDir: string = window.siyuan.config.system.workspaceDir;
    const file = 'temp/test-reload-record.txt';
    const filePath = path?.join(workspaceDir, file);

    if (!fs.existsSync(filePath)) {
        //create
        fs.writeFileSync(filePath, '', 'utf8');
    }

    const appendFile = (text: string) => {
        fs.appendFileSync(filePath, text, 'utf8');
    }

    return {
        appendFile,
        filePath,
    }
}

export function formatDateToLocalISOString(date: Date) {
    // 获取年、月、日、时、分、秒、毫秒
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

    // 获取时区偏移量（以分钟为单位）
    const timezoneOffset = -date.getTimezoneOffset();
    const timezoneHours = String(Math.floor(timezoneOffset / 60)).padStart(2, '0');
    const timezoneMinutes = String(Math.abs(timezoneOffset % 60)).padStart(2, '0');

    // 构建时区偏移量字符串
    const timezoneString = `${timezoneOffset >= 0 ? '+' : '-'}${timezoneHours}:${timezoneMinutes}`;

    // 构建 ISO 格式的字符串
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${timezoneString}`;
}

let localFileLog: ReturnType<typeof useLocalLogFile> = {
    appendFile: () => { },
    filePath: '',
}

const logging = (msg: string) => {
    const currentTime = formatDateToLocalISOString(new Date());
    msg = `[${currentTime}] ${msg}`;
    console.log(msg);
    localFileLog.appendFile(msg + '\n');
}

const loggingWsMain = (e: CustomEvent<IEventBusMap['ws-main']>) => {
    const { cmd, data, msg } = e.detail;
    if (!['reloadPlugin', 'syncing', 'syncMergeResult'].includes(cmd)) {
        return
    }
    // data is string ?
    let dataStr = data as string;
    if (typeof data === 'object') {
        dataStr = JSON.stringify(data);
    }
    logging(cmd + ':' + dataStr + `"${msg}"`);
}

export default class PluginSample extends Plugin {

    private settingUtils: SettingUtils;

    async onload() {
        localFileLog = useLocalLogFile();

        logging('Plugin.onload');

        this.addTopBar({
            icon: "iconEmoji",
            title: 'Test Reload',
            callback: () => {
                this.setting.open(this.name);
            }
        });

        this.initSettingUtils();

        this.eventBus.on('ws-main', loggingWsMain);
    }

    private initSettingUtils() {
        this.settingUtils = new SettingUtils({
            plugin: this, name: STORAGE_NAME,
            callback: (data) => {
                const msg = `Config changed: ${JSON.stringify(data)}`;
                logging(msg);
            }
        });
        this.settingUtils.addItem({
            key: "Input",
            value: "",
            type: "textinput",
            title: "Readonly text",
            description: "Input description"
        });
        this.settingUtils.addItem({
            key: "InputArea",
            value: "",
            type: "textarea",
            title: "Readonly text",
            description: "Input description",
        });
        this.settingUtils.addItem({
            key: "Check",
            value: true,
            type: "checkbox",
            title: "Checkbox text",
            description: "Check description"
        });
        this.settingUtils.addItem({
            key: "Select",
            value: 1,
            type: "select",
            title: "Select",
            description: "Select description",
            options: {
                1: "Option 1",
                2: "Option 2"
            },
        });
        this.settingUtils.addItem({
            key: "Slider",
            value: 50,
            type: "slider",
            title: "Slider text",
            description: "Slider description",
            direction: "column",
            slider: {
                min: 0,
                max: 100,
                step: 1,
            }
        });
        return this.settingUtils;
    }

    onLayoutReady() {
        // this.loadData(STORAGE_NAME);
        this.settingUtils.load().then(data => {
        })
    }

    async onunload() {
        this.eventBus.off('ws-main', loggingWsMain);
        logging('Plugin.onunload');
    }
}
