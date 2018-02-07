var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var hbs = require('hbs');
var csrf = require('csurf');
var xssFilter = require('x-xss-protection');
//国际化
var i18n = require('i18n');
//config
var config = require('./config');
var app_init = require('./app_init');
//用来作为文件回显的js
var fileUtil = require('./routes/fileDownLoad');
var app = express();
app.use("/"+config.project.appid+"/fileUtil",fileUtil);
// 开发平台
var gmdp = require('gmdp').init_gmdp;
var mqtt_init = require('./app/common/job/utils/mqtt_init');
var xss = require('xss');
app.use(config.project.appurl + '/file',express.static('/opt/apps/upload'));

// 路由自动挂载
var tree_utils = gmdp.core_tree_utils;


/*var logHelper = require('./app/common/log/utils/log_util.js');
 var seqHelper = require('./app/common/log/utils/sequence_util.js');


 //装载日志请求
 logHelper.use(app);

 //装载流水号中间件
 app.use(seqHelper.seqCreate);*/
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: false}));
//防止XSS跨站漏洞
app.use(xssFilter({ setOnOldIE: true }));
//防止XSS 攻击
app.use(function (req, res, next) {
    //反正XSS攻击，过滤html字符，处理get请求
    if(req.query){
        var query=req.query;
        for(let item in query){
            req.query[item]=xss(query[item])
        }
    }
    //处理post请求
    if(req.body){
        var body=req.body;
        for(let item in body){
            req.body[item]=xss(body[item])
        }
    }
    next();
});
//将全局配置信息传入locals
app.locals.projcfg = config.project;

i18n.configure({
    locales: ['zh_CN'],  // setup some i18n - other i18n default to en_US silently
    defaultLocale: 'zh_CN',
    directory: path.join(__dirname, 'views/common/i18n'),
    updateFiles: false,
    indent: "\t",
    extension: '.json'  // 由于 JSON 不允许注释，所以用 js 会方便一点，也可以写成其他的，不过文件格式是 JSON
});

// 加载系统参数和数据字典
//coreService.init();
gmdp.init_sys();

// 初始化加载的内容
app_init.$(app);

// view engine setup
app.set('views', [path.join(__dirname, 'views'), path.join(__dirname, 'node_modules/gmdp/views')]);

app.set('view engine', 'hbs');
//console.log(__dirname + '/views' + config.project.theme + '/partials');
hbs.registerPartials(__dirname + '/views/partials');

var i18n_helpers = new require('./views/common/helpers/i18n_helpers');
hbs.registerHelper(i18n_helpers);

hbs.registerHelper('ifCond', function (v1, v2, options) {
    //console.log("v1: %s , v2: %s", v1, v2);
    if (v1 === v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});

hbs.registerHelper('eq', function (v1, v2, options) {
    //console.log("v1: %s , v2: %s", v1, v2);
    if (v1 === v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});

hbs.registerHelper('neq', function (v1, v2, options) {
    //console.log("v1: %s , v2: %s", v1, v2);
    if (v1 != v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});

hbs.registerHelper('containKey', function (v1, v2, v3, options) {
    //console.log("v1: %s , v2: %s", v1, v2);
    var super_users = config.routes.super_users;
    var is_super_user = false;
    if (super_users) {
        super_users.forEach(function (item) {
            // 检查规则里面是否存在通配符
            is_super_user = is_super_user || item == v3;
        });
    }
    if (is_super_user) {
        return options.fn(this);
    }
    if (v1) {
        if (v1.hasOwnProperty(v2)) {
            return options.fn(this);
        }
    }
    return options.inverse(this);
});

/**
 * 有一个异常未处理,当v1 V2 为数字时会发生异常
 *
 */
hbs.registerHelper('ifContain', function (v1, v2, options) {

    if (v1.indexOf(v2) === 0) {
        return options.fn(this);
    }
    return options.inverse(this);
});

hbs.registerHelper('isempty', function (v1, options) {
    if(!v1 || JSON.stringify(v1) == '{}') {
        return options.inverse(this);
    }
    return options.fn(this);
});

/**
 * json object转换为string
 */
hbs.registerHelper('tostring', function (v1, options) {

    return JSON.stringify(v1);
});

/**
 * json object转换为tree结构
 */
hbs.registerHelper('totree', function (v1, options) {
    return JSON.stringify(tree_utils.transData(v1, 'id', 'pid', 'children'));
});

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'static/images/favicon.ico')));
//app.use(logger('dev'));
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({extended: false}));

app.use(cookieParser());

//Mongo-Session
var MongoStore = require('connect-mongo')(session);
app.use(session({
    secret: config.session.secret,//'gmdp_client_secret',
    key: config.session.key,   //这里的name值得是cookie的name，默认cookie的name是：connect.sid
    cookie_maxAge: config.session.cookie_maxAge,  //单位ms，即10分钟后session和相应的cookie失效过期
    resave: config.session.resave,
    saveUninitialized: config.session.saveUninitialized,
    rolling: config.session.rolling ? config.session.rolling : true,
    store: new MongoStore({
        url: config.session.mongodb_url ? config.session.mongodb_url : config.mongdb.url,
        interval: config.session.cookie_maxAge,
        collection: config.session.mongodb_collection ? config.session.mongodb_collection : 'common_user_session',
        touchAfter: 24 * 3600
    }),
     cookie: {secure: false}
}));

app.use(config.project.appurl, express.static(path.join(__dirname, 'public')));

//过滤对外接口不进行token验证
app.use('/gdgl/api/process/', require('./app/project/bpm_resource/routes/process').process())
app.use('/gdgl/api/process_instance/', require('./app/project/bpm_resource/routes/process_instance').process_instance())
app.use('/gdgl/api/process_extend/', require('./app/project/bpm_resource/routes/process_extend').process_extend())
app.use('/gdgl/api/task/', require('./app/project/bpm_resource/routes/task').task())


// app.use(cookieParser());
// //防止CSRF跨站请求伪造
app.use(csrf({ cookie: true }));
app.use(function(req,res,next){
     app.locals._csrfToken=req.csrfToken();
     next();
});



//国际化支持
app.use(i18n.init);

// cas认证
gmdp.init_cas({app: app});

// 权限检查中间件
app.use(gmdp.core_auth_check);

// 初始化路由
gmdp.init_route({app: app, basePath: config.project.appurl});

// 自动装载工程app目录下的路由
gmdp.core_mount_routes(app, __dirname + '/app', config.routes.is_debug);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});



// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('common/error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('common/error', {
        message: err.message,
        error: {}
    });
});

if(config.mqtt.is_use){
    // 初始化mqtt
    mqtt_init.init();
    //mqtt_init.initPubClient();
}

module.exports = app;