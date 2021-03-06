const model = require('../model');
const utility = require('ibird-utils');
const hooks = require('../hooks');
const common = require('../common');

/**
 * 默认列表查询路由
 * @param name 模型名称
 * @param [pre] 前置处理函数（数组）
 * @param [post] 后置处理函数（数组）
 */
module.exports = (name, pre, post) => {
    return async ctx => {
        //定义通用返回结构
        const response = common.response;

        const _PAGE = 'PAGE';
        const _ALL = 'ALL';
        const _query = ctx.query;
        _query.page = parseInt(_query.page);
        _query.size = parseInt(_query.size);
        _query.range = _query.range ? _query.range.toUpperCase() : _PAGE;
        _query.sort = _query.sort || '_id';

        const _sort = utility.parse(_query.sort);
        const _range = ctx._range || {};

        _query.sort = Object.keys(_sort) > 0 ? _sort : _query.sort;
        _query.cond = utility.parse(_query.cond);
        _query.page = !Number.isNaN(_query.page) && _query.page > 0 ? _query.page : 1;
        _query.size = !Number.isNaN(_query.size) && _query.size > 0 ? _query.size : 20;
        _query.range = [_ALL, _PAGE].indexOf(_query.range) >= 0 ? _query.range : _PAGE;

        _query.cond = Object.keys(_range).length > 0 ? { $and: [_range, _query.cond] } : _query.cond;
        try {
            let queryCache = {};
            const list = await model.list(name, _query.cond, async (query) => {
                if (_PAGE === _query.range) query.skip((_query.page - 1) * _query.size).limit(_query.size);
                query.sort(_query.sort);
                await hooks(pre, { ctx, query });
                queryCache = query;
            });
            const totalrecords = await model.count(name, queryCache._conditions);
            const totalpages = Math.ceil(totalrecords / _query.size);
            const result = Object.assign({}, response, {
                data: Object.assign(_query, {
                    list: list,
                    totalrecords: totalrecords,
                    totalpages: totalpages
                })
            });
            await hooks(post, { ctx, data: result });
            ctx.body = result;
        } catch (e) {
            ctx.body = Object.assign({}, response, { errmsg: utility.errors(e), errcode: '500' });
        }
    };
};