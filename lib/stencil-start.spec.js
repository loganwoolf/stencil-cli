import { jest } from '@jest/globals';
import path from 'path';
import StencilStart from './stencil-start.js';
import stencilPushUtilsModule from './stencil-push.utils.js';

afterAll(() => jest.restoreAllMocks());
describe('StencilStart unit tests', () => {
    const getBrowserSyncStub = () => ({
        watch: jest.fn(),
        init: jest.fn(),
    });
    const getThemeApiClientStub = () => ({
        checkCliVersion: jest.fn().mockResolvedValue({
            baseUrl: 'example.com',
            sslUrl: 'https://example.com',
        }),
        getStoreHash: jest.fn().mockResolvedValue('storeHash_value'),
        getStoreChannels: jest
            .fn()
            .mockResolvedValue([{ channel_id: 5, url: 'https://www.example.com' }]),
    });
    const getFsUtilsStub = () => ({
        existsSync: jest.fn().mockReturnValue(true),
        parseJsonFile: jest.fn().mockResolvedValue({}),
        recursiveReadDir: jest.fn(),
    });
    const getCliCommonStub = () => ({
        checkNodeVersion: jest.fn(),
    });
    const getThemeConfigManagerStub = () => ({
        themePath: '/some/absolute/config/path',
        configPath: '/some/absolute/config/path',
    });
    const getStencilConfigManagerStub = (config = {}) => ({
        read: jest.fn().mockResolvedValue(config),
    });
    const getBuildConfigManagerStub = () => ({});
    const getTemplateAssemblerStub = () => ({});
    const getCyclesDetectorConstructorStub = () => jest.fn();
    const getStencilPushUtilsStub = () => ({
        promptUserToSelectChannel: jest.fn(),
    });
    const getLoggerStub = () => ({
        log: jest.fn(),
        error: jest.fn(),
    });
    const getStoreSettingsApiClientStub = () => ({
        getStoreSettingsLocale: jest.fn().mockResolvedValue({ default_shopper_language: 'en_US' }),
    });
    const createStencilStartInstance = ({
        browserSync,
        fsUtils,
        themeApiClient,
        cliCommon,
        stencilConfigManager,
        themeConfigManager,
        buildConfigManager,
        templateAssembler,
        CyclesDetector,
        stencilPushUtils,
        logger,
        storeSettingsApiClient,
        openUrl,
    } = {}) => {
        const passedArgs = {
            browserSync: browserSync || getBrowserSyncStub(),
            fsUtils: fsUtils || getFsUtilsStub(),
            themeApiClient: themeApiClient || getThemeApiClientStub(),
            cliCommon: cliCommon || getCliCommonStub(),
            stencilConfigManager: stencilConfigManager || getStencilConfigManagerStub(),
            themeConfigManager: themeConfigManager || getThemeConfigManagerStub(),
            buildConfigManager: buildConfigManager || getBuildConfigManagerStub(),
            templateAssembler: templateAssembler || getTemplateAssemblerStub(),
            CyclesDetector: CyclesDetector || getCyclesDetectorConstructorStub(),
            stencilPushUtils: stencilPushUtils || getStencilPushUtilsStub(),
            logger: logger || getLoggerStub(),
            storeSettingsApiClient: storeSettingsApiClient || getStoreSettingsApiClientStub(),
            ...(openUrl ? { openUrl } : {}),
        };
        const instance = new StencilStart(passedArgs);
        return {
            passedArgs,
            instance,
        };
    };
    describe('constructor', () => {
        it('should create an instance of StencilStart without options parameters passed', async () => {
            const instance = new StencilStart();
            expect(instance).toBeInstanceOf(StencilStart);
        });
        it('should create an instance of StencilStart with all options parameters passed', async () => {
            const { instance } = createStencilStartInstance();
            expect(instance).toBeInstanceOf(StencilStart);
        });
    });
    describe('assembleTemplates method', () => {
        it('should obtain names of all templates in the passed templatesPath and return results of call templateAssembler.assemble for each template name', async () => {
            const templatesPath = '/some/absolute/templates/path';
            const templateNamesMock = ['layout/base', 'pages/page1'];
            const filesPathsMock = [
                templatesPath + path.sep + templateNamesMock[0] + '.html',
                templatesPath + path.sep + templateNamesMock[1] + '.html',
            ];
            const templateAssemblerResults = [
                {
                    [templateNamesMock[0]]: 'html file content 1',
                },
                {
                    [templateNamesMock[0]]: 'html file content 1',
                    [templateNamesMock[1]]: 'html file content 2',
                },
            ];
            const fsUtilsStub = {
                recursiveReadDir: jest.fn().mockResolvedValue(filesPathsMock),
            };
            const templateAssemblerStub = {
                assemble: jest
                    .fn()
                    .mockImplementationOnce((p, n, cb) => cb(null, templateAssemblerResults[0]))
                    .mockImplementationOnce((p, n, cb) => cb(null, templateAssemblerResults[1])),
            };
            const { instance } = createStencilStartInstance({
                fsUtils: fsUtilsStub,
                templateAssembler: templateAssemblerStub,
            });
            const result = await instance.assembleTemplates(templatesPath);
            expect(fsUtilsStub.recursiveReadDir).toHaveBeenCalledTimes(1);
            expect(fsUtilsStub.recursiveReadDir).toHaveBeenCalledWith(templatesPath, ['!*.html']);
            expect(templateAssemblerStub.assemble.mock.calls).toEqual([
                [templatesPath, templateNamesMock[0], expect.any(Function)],
                [templatesPath, templateNamesMock[1], expect.any(Function)],
            ]);
            expect(result).toStrictEqual(templateAssemblerResults);
        });
    });
    describe('getChannelUrl method', () => {
        const accessToken = 'accessToken_value';
        const apiHost = 'apiHost_value';
        const storeHash = 'storeHash_value';
        const channelId = 5;
        const storeUrl = 'https://www.example.com';
        it('should obtain channel id from the api', async () => {
            const channels = [{ channel_id: channelId, url: storeUrl }];
            const themeApiClientStub = {
                checkCliVersion: jest.fn(),
                getStoreHash: jest.fn().mockResolvedValue(storeHash),
                getStoreChannels: jest.fn().mockResolvedValue(channels),
            };
            const { instance } = createStencilStartInstance({
                themeApiClient: themeApiClientStub,
                stencilPushUtils: stencilPushUtilsModule,
            });
            const result = await instance.getChannelUrl({ accessToken }, { apiHost });
            expect(result).toEqual(storeUrl);
        });

        it('should obtain channel url from the CLI', async () => {
            const channelUrl = 'https://shop.bigcommerce.com';
            const channels = [{ channel_id: channelId, url: storeUrl }];
            const themeApiClientStub = {
                checkCliVersion: jest.fn(),
                getStoreHash: jest.fn().mockResolvedValue(storeHash),
                getStoreChannels: jest.fn().mockResolvedValue(channels),
            };
            const { instance } = createStencilStartInstance({
                themeApiClient: themeApiClientStub,
                stencilPushUtils: stencilPushUtilsModule,
            });
            const result = await instance.getChannelUrl({ accessToken }, { apiHost, channelUrl });
            expect(result).toEqual(channelUrl);
        });
    });

    describe('port option', () => {
        it('should read port from the config file', async () => {
            const port = 1234;
            const browserSyncStub = getBrowserSyncStub();
            const { instance } = createStencilStartInstance({
                browserSync: browserSyncStub,
                stencilConfigManager: getStencilConfigManagerStub({ port }),
            });
            instance.startLocalServer = jest.fn();
            instance.getStartUpInfo = jest.fn().mockReturnValue('Start up info');
            instance.checkLangFiles = jest.fn();
            await instance.run({});
            expect(browserSyncStub.init).toHaveBeenCalledWith(
                expect.objectContaining({
                    port,
                }),
            );
        });

        it('should read port from the cli', async () => {
            const port = 1234;
            const browserSyncStub = getBrowserSyncStub();
            const { instance } = createStencilStartInstance({
                browserSync: browserSyncStub,
                stencilConfigManager: getStencilConfigManagerStub({ port: 5678 }),
            });
            instance.startLocalServer = jest.fn();
            instance.getStartUpInfo = jest.fn().mockReturnValue('Start up info');
            instance.checkLangFiles = jest.fn();
            await instance.run({ port });
            expect(browserSyncStub.init).toHaveBeenCalledWith(
                expect.objectContaining({
                    port,
                }),
            );
        });
    });
    describe('keyboard shortcuts', () => {
        const captureStdinHandler = () => {
            let handler = null;
            const spy = jest.spyOn(process.stdin, 'on').mockImplementation((event, fn) => {
                if (event === 'data') handler = fn;
                return process.stdin;
            });
            return {
                getHandler: () => handler,
                restore: () => spy.mockRestore(),
            };
        };
        it('should open localhost URL when stdin receives "t"', async () => {
            const port = 3000;
            const openUrl = jest.fn();
            const browserSyncStub = getBrowserSyncStub();
            const loggerStub = getLoggerStub();
            const { instance } = createStencilStartInstance({
                browserSync: browserSyncStub,
                openUrl,
                logger: loggerStub,
                stencilConfigManager: getStencilConfigManagerStub({ port }),
            });
            instance.startLocalServer = jest.fn();
            instance.getStartUpInfo = jest.fn().mockReturnValue('Start up info');
            instance.checkLangFiles = jest.fn();
            const capture = captureStdinHandler();
            try {
                await instance.run({});
                const handler = capture.getHandler();
                expect(handler).toBeDefined();
                handler('t');
                expect(openUrl).toHaveBeenCalledWith(`http://localhost:${port}`);
            } finally {
                capture.restore();
            }
        });
        it('should open localhost /manage URL when stdin receives "m"', async () => {
            const port = 3000;
            const openUrl = jest.fn();
            const browserSyncStub = getBrowserSyncStub();
            const loggerStub = getLoggerStub();
            const { instance } = createStencilStartInstance({
                browserSync: browserSyncStub,
                openUrl,
                logger: loggerStub,
                stencilConfigManager: getStencilConfigManagerStub({ port }),
            });
            instance.startLocalServer = jest.fn();
            instance.getStartUpInfo = jest.fn().mockReturnValue('Start up info');
            instance.checkLangFiles = jest.fn();
            const capture = captureStdinHandler();
            try {
                await instance.run({});
                const handler = capture.getHandler();
                expect(handler).toBeDefined();
                handler('m');
                expect(openUrl).toHaveBeenCalledWith(`http://localhost:${port}/manage`);
            } finally {
                capture.restore();
            }
        });
        it('should log a keyboard shortcuts cheat sheet when starting', async () => {
            const loggerStub = getLoggerStub();
            const browserSyncStub = getBrowserSyncStub();
            const { instance } = createStencilStartInstance({
                browserSync: browserSyncStub,
                logger: loggerStub,
                stencilConfigManager: getStencilConfigManagerStub({ port: 3000 }),
            });
            instance.startLocalServer = jest.fn();
            instance.getStartUpInfo = jest.fn().mockReturnValue('Start up info');
            instance.checkLangFiles = jest.fn();
            const capture = captureStdinHandler();
            try {
                await instance.run({});
                const stripAnsi = (s) =>
                    s.replace(
                        // eslint-disable-next-line no-control-regex
                        /\u001b\[[0-9;]*m/g,
                        '',
                    );
                const logCalls = loggerStub.log.mock.calls.map((args) => stripAnsi(args.join(' ')));
                const cheatSheet = logCalls.find((msg) => msg.includes('Keyboard Shortcuts'));
                expect(cheatSheet).toBeDefined();
                expect(cheatSheet).toMatch(/t\s+-\s+open the theme preview/);
                expect(cheatSheet).toMatch(/m\s+-\s+open the manage app/);
                expect(cheatSheet).toMatch(/r\s+-\s+reload all connected browsers/);
                expect(cheatSheet).toMatch(/q\s+-\s+stop the dev server/);
            } finally {
                capture.restore();
            }
        });
        it('should reload browsers when stdin receives "r"', async () => {
            const browserSyncStub = {
                watch: jest.fn(),
                init: jest.fn(),
                reload: jest.fn(),
            };
            const { instance } = createStencilStartInstance({
                browserSync: browserSyncStub,
                stencilConfigManager: getStencilConfigManagerStub({ port: 3000 }),
            });
            instance.startLocalServer = jest.fn();
            instance.getStartUpInfo = jest.fn().mockReturnValue('Start up info');
            instance.checkLangFiles = jest.fn();
            const capture = captureStdinHandler();
            try {
                await instance.run({});
                const handler = capture.getHandler();
                expect(handler).toBeDefined();
                handler('r');
                expect(browserSyncStub.reload).toHaveBeenCalled();
            } finally {
                capture.restore();
            }
        });
        it('should send SIGINT and stop the build worker when stdin receives "q"', async () => {
            const browserSyncStub = getBrowserSyncStub();
            const buildConfigManagerStub = { stopWorker: jest.fn() };
            const { instance } = createStencilStartInstance({
                browserSync: browserSyncStub,
                buildConfigManager: buildConfigManagerStub,
                stencilConfigManager: getStencilConfigManagerStub({ port: 3000 }),
            });
            instance.startLocalServer = jest.fn();
            instance.getStartUpInfo = jest.fn().mockReturnValue('Start up info');
            instance.checkLangFiles = jest.fn();
            const killSpy = jest.spyOn(process, 'kill').mockImplementation(() => true);
            const capture = captureStdinHandler();
            try {
                await instance.run({});
                const handler = capture.getHandler();
                expect(handler).toBeDefined();
                handler('q');
                expect(buildConfigManagerStub.stopWorker).toHaveBeenCalledWith('SIGTERM');
                expect(killSpy).toHaveBeenCalledWith(process.pid, 'SIGINT');
            } finally {
                capture.restore();
                killSpy.mockRestore();
            }
        });
        it('should stop the build worker on process exit', async () => {
            const browserSyncStub = getBrowserSyncStub();
            const buildConfigManagerStub = { stopWorker: jest.fn() };
            const { instance } = createStencilStartInstance({
                browserSync: browserSyncStub,
                buildConfigManager: buildConfigManagerStub,
                stencilConfigManager: getStencilConfigManagerStub({ port: 3000 }),
            });
            instance.startLocalServer = jest.fn();
            instance.getStartUpInfo = jest.fn().mockReturnValue('Start up info');
            instance.checkLangFiles = jest.fn();
            const capture = captureStdinHandler();
            try {
                await instance.run({});
                process.emit('exit');
                expect(buildConfigManagerStub.stopWorker).toHaveBeenCalledWith('SIGTERM');
            } finally {
                capture.restore();
            }
        });
    });
});
