var model_user=require("../models/user_model");
var Pormise=require("bluebird");
// var utils = require('../../../../lib/utils/app_utils');
var new_model=require("../models/newest_user_model");
// var mysql_pool=require("../../../../lib/mysql_pool");
// var mysql_pool_bpm=require("../../../../lib/mysql_pool_athena");
 var config   = require('../../../../config');

//用于更新OA 数据
// exports.sync_data_from_OA=function(){
//     sync_data_from_OA ();
// }
//
//
//  sync_data_from_OA();

//判断是否开启定时任务
if(config.switchDetail.oa_switch){
    var schedule = require("node-schedule");
    var rule = new schedule.RecurrenceRule();

    rule.dayOfWeek = [0, new schedule.Range(1, 6)];
    rule.hour = config.hy_time.hour;
    rule.minute = config.hy_time.minute;
    schedule.scheduleJob(rule, function(){
        sync_data_from_OA ();
    });
}

function sync_data(data,resolve,reject){
    var map = {};
    map.compTime= "";
    map.successOrfail = 0;
    map.error =data ;
    map.failTime = new Date();
    map.results ='同步失败';
    model_user.$synchData.create(map,function(errorss,results){
        if(errorss){
            resolve({"data":null,"error":errorss,"msg":"同步数据时记录"});
        }else{
            return;
        }
    })
}
async function sync_data_from_OA (resolve,reject) {
             let rs = await update_org_main();//没有问踢
            if(rs.error ==null){
                console.log("机构更新成功");
            }else{
                sync_data(rs.error);
                return;
            }
             let rs_org_pid = await update_org_pid_main();//没有问题
            if(rs_org_pid.error==null){
                console.log("机构父id更新成功");
            }else{
                sync_data(rs_org_pid.error);
                return;
            }
             let rs_role =   await update_role_main();
            if(rs_role.error==null){
                console.log("角色更新成功");
            }else{
                sync_data(rs_role.error);
                return;
            }
              let rs_user = await update_user_main();
              if(rs_user.error == null ){
                  console.log('用户更新成功');
              }else{
                  sync_data(rs_user.error);
                  return;
              }
              let rs_user_org =   await link_user_and_org_main();
              if(rs_user_org.error == null ){
                  console.log('用户关联机构更新完成');
              }else{
                  sync_data(rs_user_org.error);
                  return;
              }
              let rs_user_role = await link_user_and_role_main();
                if(rs_user_role.error == null){
                 var map = {};
                map.compTime= new Date();
                map.successOrfail = 1;
                map.error =rs_user_role.error;
                map.failTime = '';
                map.results ='同步成功';
                await model_user.$synchData.create(map);
                }else{
                    sync_data(rs_user_role.error);
                    return;
                }
             console.log("rs同步完成s");
            return ;
}


//check_data();
function check_data(){
    new_model.$User.find({},function(err,res){
        check_sub(res,0)
    })
}
function check_sub(arr,k){
    if(arr.length>k){
        var user = arr[k];
        model_user.$User.find({"user_no":user.user_no},function(err,res){
            new_model.$Role.find({"_id":{$in:user.process_roles}},function(error,result){
                var ids=new Array();
                for(let i in result){
                    ids.push(result[i].role_name);
                }
                model_user.$Role.find({"role_name":{$in:ids}},function(e,r){
                    var id=new Array();
                    for(let i in r){
                        id.push(r[i]._id)
                    }
                    if(res.length>0||id.length>0){
                        model_user.$User.update({"_id":res[0]._id},{$set:{"user_roles":id}},function(errs,ress){
                            if(errs){
                                console.log(errs);
                            }else{
                                k++;
                                check_sub(arr,k)
                            }
                        })
                    }else{
                        k++;
                        check_sub(arr,k)
                    }
                })
            });
        })
    }else{
        return ;
    }
}

/**
 *
 * 把用户和对应的角色连接起来主程序
 * @returns {Promise}
 */
function link_user_and_role_main(){
    return new Promise(function(resolve,reject){
        new_model.$User.find({},function(error,result){
            if(error){
                console.log(error);
                resolve({"data":null,"error":error,"msg":"角link org to user错误 2"});
            }else{
                link_user_and_role_sub(0,result,resolve);

            }
        });
    });
}
//
//把用户和对应的角色连接起来实际执行程序
function link_user_and_role_sub(k,array,resolve){
    if(array&&array.length>k){
        var user=array[k]._doc;
        if(user){
            //更新用户角色慧眼用户表角色字段process_roles
            var roles=user.process_roles;
            model_user.$User.find({"user_no":user.user_no},function(e,r){
                if(e){
                    resolve({"data":null,"error":e,"msg":"角link org to user错误 3"});
                }else{
                    if(r.length>0){
                        new_model.$Role.find({"_id":{$in:roles}},function(error,result){
                            if(error){
                                console.log(error);
                                resolve({"data":null,"error":error,"msg":"funcking   !!!!"});
                            }else{
                                if(result.length>0){
                                    var role_names=[];
                                    for(var i in result){
                                        var role=result[i];
                                        role_names.push(role.role_name);
                                    }
                                    model_user.$Role.find({"role_name":{$in:role_names}},function(errors,results){
                                        if(errors){
                                            console.log(errors);
                                            resolve({"data":null,"error":errors,"msg":"funcking   !!!!"});
                                        } else{
                                            if(results.length>0){
                                                var role_ids=[];
                                                for(var m in results){
                                                    role_ids.push(results[m]._id);
                                                }
                                                model_user.$User.update({"_id":r[0]._id},{$set:{"user_roles":role_ids}},{},function(e,r){
                                                    if(e){
                                                        console.log(e);
                                                        resolve({"data":null,"error":e,"msg":"funcking   !!!!"});
                                                    }else{
                                                        k++;
                                                        link_user_and_role_sub(k,array,resolve);
                                                    }
                                                });
                                            }else{
                                                k++;
                                                link_user_and_role_sub(k,array,resolve);
                                            }
                                        }
                                    });
                                }else{
                                    k++;
                                    link_user_and_role_sub(k,array,resolve);
                                }
                            }
                        });
                    }else{
                        k++;
                        link_user_and_role_sub(k,array,resolve);
                    }
                }
            })
        }else{
            k++;
            link_user_and_role_sub(k,array,resolve);
        }
    }else{
     resolve({"data":null,"error":null,"msg":"角link or 2"});
     return ;
    }
}

/**
 *
 * 把用户和对应的组织连接起来主程序
 *
 */


function link_user_and_org_main(){
    return new Promise(function(resolve,reject){
        new_model.$User.find({},function(error,result){
            if(error){
                console.log(error);
                resolve({"data":null,"error":error,"msg":"角link org to user错误 2"});
            }else{
                link_user_and_org_sub(0,result,resolve);
            }
        });
    });
}

/**
 *
 * 把用户和对应的组织连接起来实际执行程序
 * @param k
 * @param array
 * @param resolve
 */
function link_user_and_org_sub(k,array,resolve){
    if(array&&array.length>k){
        var user=array[k];
        var user_org=user.user_org;
        model_user.$User.find({"user_no":user.user_no},function(e,r){
            if(r.length>0){
                new_model.$CommonCoreOrg.find({"_id":{$in:user_org}},function(error,result){
                    if(error){
                        console.log(error);
                        resolve({"data":null,"error":error,"msg":"角link org to user错误 3"});
                    }else{
                        if(result.length>0){
                            var org_name=result[0].org_code_desc;
                            model_user.$CommonCoreOrg.find({"org_code_desc":org_name},function(errors,results){
                                if(errors){
                                    console.log(errors);
                                    resolve({"data":null,"error":errors,"msg":"角link org to user错误 4"});
                                }else{
                                    if(results.length>0){
                                        // var org_id=results[0]._id;
                                        var map={};
                                        map.user_org=[results[0]._id];
                                        model_user.$User.update({"_id":r[0]._id},{$set:map},{},function(e,r){
                                            if(e){
                                                console.log(e);
                                                resolve({"data":null,"error":e,"msg":"角link org to user错误 5"});
                                            }else{
                                                k++;
                                                link_user_and_org_sub(k,array,resolve);
                                            }
                                        });
                                    }else{
                                        k++;
                                        link_user_and_org_sub(k,array,resolve);
                                    }
                                }
                            });
                        }else{
                            k++;
                            link_user_and_org_sub(k,array,resolve);
                        }
                    }
                });
            }else{
                k++;
                link_user_and_org_sub(k,array,resolve);
            }
        })
    }else{
        resolve({"data":null,"error":null,"msg":"角link org to user is over"});
        return ;
    }
}


/**
 * 更新用户数据的主程序
 * @returns {Promise}
 */
function update_user_main(){
    return new Promise(function(resolve,reject){
        new_model.$User.find({},function(error,result){
            if(error){
                console.log(error);
            }else{
                update_user_sub(0,result,resolve);
            }
        });
    });
}

/**
 * 更新用户的实际执行程序
 * @param k
 * @param array
 * @param resolve
 */

function update_user_sub(k,array,resolve){
    if(array&&array.length>k){
        var user=array[k];
      if(user.user_no=='admin'){
          k++;
          update_user_sub(k,array,resolve);
      }
      else if(user.user_org==null){
          k++;
          update_user_sub(k,array,resolve);
      }else{
          var login_account=user.login_account;
          var map={};
          map.login_account=user.login_account;// : String,// 登录账号
          map.user_status=user.user_status;// : Number,// 用户状态
          map.user_id=user.user_id;//:String,//用户ID
          map.user_no=user.user_no;// : String,// 用户工号
          map.user_name=user.user_name;// : String,// 用户姓名
          map.user_gender=user.user_gender;// : String,// 用户性别
          map.user_phone=user.user_phone;// : String,// 用户手机
          map.user_tel=user.user_tel;// : String,// 用户联系电话
          map.user_email=user.user_email;// : String,// 用户邮箱
          map.login_password=user.login_password;// : String,// 登录密码
          map.user_org=user.user_org.toString().split(",");// : {type: Schema.Types.ObjectId, ref: 'CommonCoreOrg'},// 所在部门
          map.user_sys=user.user_sys;// : String,// 所属系统
          map.user_org_desc=user.user_org_desc;//:String,//所属系统的 描述
          map.theme_name=user.theme_name;// : String,// 使用主题
          map.theme_skin=user.theme_skin;// : String,// 使用皮肤
          map.user_photo=user.user_photo;// : String,// 用户头像/照片
          map.sys_roles=user.user_roles;// : [{type: Schema.Types.ObjectId}],// 菜单访问权限使用角色
          map.user_roles=user.process_roles;//:[{type:Schema.Types.ObjectId}],//流程使用的角色
          map.boss_id="";//:String=""//对接外部系统专用的 Boss_id
          map.smart_visual_sys_user_id="oa";  //:String,//慧眼系统的 User_id
          map.athena_sys_user_id="";//:String=""///Athena系统的user_id
          map.athena_app_sys_user_id="";//:String,//Athena_app系统的user_id
          map.inspect_sys_user_id="";//:String,//稽查系统的user_id
          map.token="";//String//不知道是什么东西，留着吧
          map.special_sign="";//:String,//也不知道是什么东西 留着把

          model_user.$User.find({"login_account":login_account},function(error,result){
              if(error){
                  console.log(error);
              }else{
                  if(result.length>0){
                      //update
                      model_user.$User.update({"_id":result[0]._id},{$set:map},{},function(errors,results){
                          if(errors){
                              console.log(errors);
                              resolve({"data":null,"error":errors,"msg":"插入角色表错误 2"});
                          }else{
                              k++;
                              update_user_sub(k,array,resolve);
                          }
                      });
                  }else{
                      //create
                      model_user.$User.create(map,function(errors,results){
                          if(errors){
                              console.log(errors);
                          }else{
                              var map ={};
                              map.asyncTime = (new Date()).toLocaleDateString();
                              map.class = 'user';
                              map.from_sys = 'oa';
                              map.code =user.login_account;
                              map.name = user.user_name;
                              model_user.$asynch_Data.create(map,function (err) {
                                  if(err){
                                      console.log(err);
                                      resolve({"data":null,"error":err,"msg":"记录新增数据错误 "});
                                  }else{
                                      k++;
                                      update_user_sub(k,array,resolve);
                                  }
                              })
                          }
                      });
                  }
              }
          });
      }
    }else{
        resolve({"data":null,"error":null,"msg":"game is over  ~~! 2"});
        return ;
    }
}

/**
 * 更新角色的主程序
 * @returns {Promise}
 */
function update_role_main(){
    return new Promise(function(resolve,reject){
        new_model.$Role.find({},function(error,result){
            if(error){
                console.log(error);
                resolve({"data":null,"error":error,"msg":"查询角色表错误 "});
            }else{
                if(result.length>0){
                    // console.log(result);
                    update_role_sub(0,result,resolve);
                }
            }
        });
    });
}

/**
 * 更新角色的实际执行代码方法
 * @param k
 * @param array
 * @param resolve
 */
function update_role_sub(k,array,resolve){
    if(array&&array.length>k){
        var role=array[k];
        var role_name=role.role_name;
        model_user.$Role.find({"role_name":role_name},function(error,result){
            if(error){
                console.log(error);
                resolve({"data":null,"error":error,"msg":"插入角色表错误1 "});
            }else{
                var map={};
                map.role_code=role.role_code;//: String,//角色编码
                map.role_name=role.role_name;//: String,//角色名称
                map.role_tag=role.role_tag;//: Number,//角色标志：1-内部，2-外部
                map.role_level=role.role_level;//: Number,//角色级别：1-省级，2-市级，3-县级
                map.role_status=role.role_status;//:Number,//状态：1-有效，2-停用
                map.role_remark=role.role_remark;//:String,//角色描述
                map.role_order= role.role_order;//: Number,//序号
                map.smart_visual_sys_role_id="";//:String,//慧眼系统的role_id
                map.athena_sys_role_id="";//:String=//,//Athena系统的role_id
                map.athena_app_sys_role_id="";//:String,//Athena_app系统的role_id
                map.inspect_sys_role_id="";//:String,//稽查系统的role_id
                if(result.length>0){
                    model_user.$Role.update({"_id":result[0]._id},{$set:map},{},function(errors,results){
                        if(error){
                            console.log(errors);
                            resolve({"data":null,"error":errors,"msg":"插入角色表错误 2"});
                        }else{
                            k++;
                            update_role_sub(k,array,resolve);
                        }
                    });
                }else{
                    // delete role._id;
                    model_user.$Role.create(map,function(errors,results){
                        if(errors){
                            console.log(errors);
                            resolve({"data":null,"error":errors,"msg":"插入角色表错误3 "});
                        }else{
                            var map ={};
                            map.asyncTime = (new Date()).toLocaleDateString() ;
                            map.class = 'role';
                            map.from_sys = 'oa';
                            map.code = role.role_code;
                            map.name = role.role_name;
                            model_user.$asynch_Data.create(map,function (err) {
                                if(err){
                                    console.log(err);
                                    resolve({"data":null,"error":err,"msg":"记录新增数据错误 "});
                                }else{
                                    k++;
                                    update_role_sub(k,array,resolve);
                                }
                            })
                        }
                    });
                }
            }
        });
    }else{
        resolve({"data":null,"error":null,"msg":"time is over "});
        return ;
    }
}


//更新org的 PID 的 主函数
function update_org_pid_main(){
    return new Pormise(function(resolve,reject){
        new_model.$CommonCoreOrg.find({},function(error,result){
            if(error){
                console.log(error);
                resolve({"data":null,"error":error,"msg":"第二次使用mongo数据出错  完全不让人活了 "});
            }else{
                if(result.length>0){
                    var k=0;
                    update_org_sub_async(k,result,resolve);
                }else{
                    resolve({"data":null,"error":null,"msg":"查询数据 失败 >>>>>>>>> fuck! "});
                }
            }
        });
    });
}

//更新org的 PID 的 副函数；
function update_org_sub_async(k,array,resolve){
    if(array&&array.length>k){
        var org=array[k];
        // var _id=org._id;
        var pid=org.org_pid;
        var org_name=org.org_name;
        if(pid!="0"&&pid!=1){
            new_model.$CommonCoreOrg.find({"_id":pid},function(e,r){
                if(e){
                    console.log(e);
                    resolve({"data":null,"error":e,"msg":"查询数据 失败 >>>>>>>>> fuck! "});
                } else{
                    if(r.length>0){
                        var parent=r[0];
                        model_user.$CommonCoreOrg.find({"org_code_desc":parent.org_code_desc},function(es,rs){
                            if(es){
                                console.log(es);
                                resolve({"data":null,"error":es,"msg":"最后一步  最后一步  查询org_name 报错 坑爹啊  "});
                            } else{
                                if(rs.length>0){
                                    var map = {};
                                    map.org_pid=rs[0]._id;
                                    model_user.$CommonCoreOrg.find({"org_code_desc":org.org_code_desc},function(errors,results){
                                        if(errors){
                                            console.log(errors);
                                            resolve({"data":null,"error":errors,"msg":"个锤子的 还错！  "});
                                        }else{
                                            if(results.length>0){
                                                model_user.$CommonCoreOrg.update({"_id":results[0]._id},{$set:map},{},function(err,res){
                                                    if(err){
                                                        console.log(err);
                                                        resolve({"data":null,"error":err,"msg":"再错了  我也不改动了  "});
                                                    }else{
                                                        k++;
                                                        update_org_sub_async(k,array,resolve);
                                                    }

                                                });
                                            }else{
                                                k++;
                                                update_org_sub_async(k,array,resolve);
                                            }
                                        }
                                    });

                                }else{
                                    k++;
                                    update_org_sub_async(k,array,resolve);
                                }
                            }

                        });
                    }else{
                        console.log("不存在  parent_id");
                        k++;
                        update_org_sub_async(k,array,resolve);
                    }
                }
            });
        }else{
            k++;
            update_org_sub_async(k,array,resolve);
        }
    }else{
        resolve({"data":null,"error":null,"msg":"everything is over ! "});
        return;
    }
}



//用于更新 org 的主函数使用方法 ：首先去外部提供的数据库表中 查询数据，然后去正在使用的org表格中 通过关键字 org_name 对比更新或者 插入
function update_org_main (){
    return new Pormise(function(resolve,reject){
        new_model.$CommonCoreOrg.find({},function(error,result){
            if(error){
                // console.log(error);
                resolve({"data":null,"error":error,"msg":"初次使用mongo数据出错  让不让人 活了  "});
            }else{
                if(result.length>0){
                     update_org(0,result,resolve);
                }else{
                    resolve({"data":null,"error":null,"msg":"卧槽 查询不到数据！"});

                }
            }
        });

    });
}
//这里是 update_org_main 用于控制异步的方法
function update_org(k,array,resolve){
    if(array&&array.length>k){
        var condition={};
        var org=array[k];
        if(org){
            var org_code_desc=org.org_code_desc;
            condition.org_code_desc=org_code_desc;
            model_user.$CommonCoreOrg.find(condition,function(error,result){
                if(error){
                    console.log(error);
                    resolve({"data":null,"error":error,"msg":"查询原来的失败啦  还是 org 表 这不科学"});
                }else{
                    if(result.length>0){
                        if(org.level==3){
                            k++;
                            update_org(k,array,resolve);
                        }else {
                            var map={};
                            map.org_name=org.org_name;
                            map.org_code_desc=org.org_code_desc;
                            map.org_fullname=org.org_fullname;
                            map.company_code=org.company_code;
                            // console.log(org)
                            if(org.level){
                                map.level=org.level;
                            }else{
                                map.level=null;
                            }

                            map.org_order=org.org_order;
                            map.org_type=org.org_type;
                            map.org_pid=org.org_pid;
                            map.company_no=org.company_no;
                            map.parentcode_desc=org.parentcode_desc;
                            map.org_status=org.org_status;
                            map.org_belong=org.org_belong;
                            map.midifytime=org.midifytime;
                            map.org_code=org.org_code;
                            map.smart_visual_sys_org_id="";
                            map.athena_sys_org_id="";
                            map.athena_app_sys_org_id="";
                            map.inspect_sys_org_id="";
                            model_user.$CommonCoreOrg.update({"_id":result[0]._id},{$set:map},{},function(err,res){
                                if(err){
                                    console.log(err);
                                }else{
                                    k++;
                                    update_org(k,array,resolve);
                                }
                            });
                        }
                    }else{
                        var map={};
                        map.org_name=org.org_name;
                        map.org_code_desc=org.org_code_desc;
                        map.org_fullname=org.org_fullname;
                        map.company_code=org.company_code;
                        map.level=org.level;
                        map.org_order=org.org_order;
                        map.org_type=org.org_type;
                        map.org_pid=org.org_pid;
                        map.company_no=org.company_no;
                        map.parentcode_desc=org.parentcode_desc;
                        map.org_status=org.org_status;
                        map.org_belong=org.org_belong;
                        map.midifytime=org.midifytime;
                        map.org_code=org.org_code;
                        map.smart_visual_sys_org_id="";
                        map.athena_sys_org_id="";
                        map.athena_app_sys_org_id="";
                        map.inspect_sys_org_id="";
                        model_user.$CommonCoreOrg.create(map,function(e,r){
                            if(e){
                                console.log(e);
                                resolve({"data":null,"error":e,"msg":"org 完全不给面子都不让老子插入数据库"});
                            }else{
                                var map ={};
                                map.asyncTime = (new Date()).toLocaleDateString();
                                map.class = 'org';
                                map.from_sys = 'oa';
                                map.code =org.org_code;
                                map.name = org.org_fullname;
                                model_user.$asynch_Data.create(map,function (err) {
                                    if(err){
                                        console.log(err);
                                        resolve({"data":null,"error":err,"msg":"记录新增数据错误 "});
                                    }else{
                                        k++;
                                        update_org(k,array,resolve);
                                    }
                                })
                            }
                        });
                    }
                }
            });
        }


    }else{
        resolve({"data":null,"error":null,"msg":"everything is over ! "});
        return ;
    }
}