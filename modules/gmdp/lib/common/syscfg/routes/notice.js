/**
 * Created by zhaojing on 2016/5/03.
 */

var express = require('express');
var router = express.Router();

var utils = require('../../core/utils/app_utils');
var noticeService = require('../services/notice_service');

router.route('/')

    // -------------------------------query查询公告列表-------------------------------
    .get(function(req,res){
        // 分页条件
        var notice_title = req.query.notice_title;
        var notice_status = req.query.notice_status;
        var notice_role = req.query.notice_role;
        var notice_system = req.query.notice_system;
        // 分页参数
        var page = req.query.page;
        var length = req.query.rows;

        var conditionMap = {};
        if(notice_title){
            conditionMap.notice_title = new RegExp(notice_title);
        }
        if(notice_status && notice_status != -1){
            conditionMap.notice_status = parseInt(notice_status);
        }
        if(notice_role){
            if(notice_role != -1){
                conditionMap.notice_role = notice_role;
            }
        }
        if(notice_system){
            conditionMap.notice_system = notice_system;
        }
        // 调用分页
        noticeService.getNoticeList(page, length, conditionMap, function(result){
            utils.respJsonData(res, result);
        });
    })

    // -------------------------------create添加公告-------------------------------
    .post(function(req,res){

        // 获取提交信息
        var notice_title = req.body.notice_title;//公告标题
        var notice_role = req.body.notice_role;//公告所属角色
        var notice_system = req.body.notice_system;//公告所属系统
        var notice_status = req.body.notice_status;//公告状态
        var notice_info = req.body.notice_info;//公告内容
        var notice_author = req.body.notice_author;//公告发布人

        // 验证公告标题是否为空
        if(!notice_title) {
            utils.respMsg(res, false, '2001', '公告标题不能为空。', null, null);
            return;
        }
        // 验证公告所属系统是否为空
        if(!notice_system) {
            utils.respMsg(res, false, '2002', '公告所属系统不能为空。', null, null);
            return;
        }
        // 验证公告状态是否为空
        if(!notice_status) {
            utils.respMsg(res, false, '2003', '公告状态不能为空。', null, null);
            return;
        }
        // 验证公告内容是否为空
        if(!notice_info) {
            utils.respMsg(res, false, '2004', '公告内容不能为空。', null, null);
            return;
        }

        //构造公告保存参数
        var noticeEntity = {};
        noticeEntity.notice_title = notice_title;
        if(notice_role != -1){
            noticeEntity.notice_role = notice_role;
        }else {
            noticeEntity.notice_role = null;
        }
        noticeEntity.notice_system = notice_system;
        noticeEntity.notice_status = notice_status;
        noticeEntity.notice_info = notice_info;
        noticeEntity.notice_author = notice_author;
        noticeEntity.notice_time = new Date();

        // 调用业务层保存方法
        noticeService.saveNotice(noticeEntity, function(result){
            utils.respJsonData(res, result);
        });
    });

// -------------------------------获取最新的一条记录-------------------------------
router.route('/newest/')
    .get(function(req, res){
        noticeService.getNewest(function(result){
            utils.respJsonData(res, result);
        });
    });

router.route('/:id')
    .get(function(req,res){
        var id = req.params.id;
        if (!id) {
            utils.respMsg(res, false, '2001', 'id不能为空。', null, null);
        }
        var fields = {_id:0, notice_title: 1, notice_info: 1, notice_status: 1}; // 待返回的字段
        noticeService.getNoticeById(id,fields,function(result){
            utils.respJsonData(res, result);
        });
    })
    // -------------------------------update修改公告-------------------------------
    .put(function(req,res) {
        var id = req.params.id;//公告id
        var notice_title = req.body.notice_title;//公告标题
        var notice_role = req.body.notice_role;//公告所属角色
        var notice_system = req.body.notice_system;//公告所属系统
        var notice_status = req.body.notice_status;//公告状态
        var notice_info = req.body.notice_info;//公告内容
        var notice_author = req.body.notice_author;//公告发布人

        // 验证公告名是否为空
        if(!notice_title) {
            utils.respMsg(res, false, '2001', '公告标题不能为空。', null, null);
            return;
        }
        // 验证公告所属系统是否为空
        if(!notice_system) {
            utils.respMsg(res, false, '2002', '公告所属系统不能为空。', null, null);
            return;
        }
        // 验证公告状态是否为空
        if(!notice_status) {
            utils.respMsg(res, false, '2003', '公告状态不能为空。', null, null);
            return;
        }
        // 验证公告内容是否为空
        if(!notice_info) {
            utils.respMsg(res, false, '2004', '公告内容不能为空。', null, null);
            return;
        }

        //构造公告保存参数
        var noticeEntity = {};
        noticeEntity.notice_title = notice_title;
        if(notice_role != -1){
            noticeEntity.notice_role = notice_role;
        }else {
            noticeEntity.notice_role = null;
        }
        noticeEntity.notice_system = notice_system;
        noticeEntity.notice_status = notice_status;
        noticeEntity.notice_info = notice_info;
        noticeEntity.notice_author = notice_author;
        noticeEntity.notice_time = new Date();

        // 调用修改方法
        noticeService.updateNotice(id, noticeEntity, function(result) {
            utils.respJsonData(res, result);
        });
    });

module.exports = router;