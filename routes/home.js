'use strict';
var express = require('express');
var router = express.Router();
var config = require('config');
var debug = require('debug')('mailsac-home-routes');
var dns = require('dns');

/**
 * Homepage
 */
router.get('/', function routeGetIndexHomepage(req, res) {
    res.render('index', { title: config.get('name') });
});

// needs to go, make SPA!
router.get('/inbox/:email', function routeGetInboxEmail(req, res, next) {
    res.render('inbox-base', {
        title: req.params.email,
        email: req.params.email
    });
});

// domain API, move to another file

// list all
router.get('/api/domain', function(req, res, next){
    
    req.db.Domain
        .find(function(error, data){
            if(error){
                res.status(500);
                res.json({
                    error: error
                });
                return res.end()
            }else{
                res.send(data);
                return res.end();
            }
        });
});


// add domain
router.post('/api/domain/:domain', function(req, res, nex){
    var checkIp = '45.55.137.217';

    req.db.Domain.find().where('domain', req.params.domain).exec(function(err, items){
        if(items.length === 0){
            dns.resolveMx(req.params.domain, function(error, data){
                if(error || data.length === 0){
                    res.status(400);
                    res.json({
                        domain: req.params.domain,
                        error: error || "no record found"
                    });
                    return res.end();
                }
                var exchange = data[0].exchange;

                if(!exchange.match(/\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}/)){

                    dns.lookup(exchange, function(error, ip, family){

                        if(ip === checkIp){
                            console.log('ip checks out!')

                            var rec = new req.db.Domain({
                                domain: req.params.domain,
                                is_active: true
                            }).save(function(error, item){
                                if(error){
                                    res.status(500);
                                    res.json({
                                        error: error
                                    });
                                    return res.end();
                                }

                                res.json(item);
                                return res.end();
                            });

                        }else{
                            res.status(400);
                            res.json({
                                domain_ip: ip,
                                servers_ip: checkIp,
                                domain: req.params.domain,
                                error: "Domain MX record does not match this servers IP"
                            });
                            return res.end();
                        }
                    });
                }else{
                    res.status(400);
                    res.json({
                        domain: res.params.domain,
                        error: "MX record does not point to FQDN"
                    });
                    return res.end
                }
            });
        }else{
            return res
                .status(409)
                .json({
                    domain: req.params.domain,
                    error: 'Domain already exist.'
                })
                .end();
        }
    });

        

});

// delete domain
router.delete('/api/domain/:domain', function(req, res, next){});

// message API, move to another file
router.get(['/dirty/:messageId/', '/raw/:messageId'], function routeGetDirtyOrRawMsg(req, res, next) {
    req.db.Message
        .findById(req.params.messageId)
        .exec(function (err, msg) {
            if (err) {
                return next(err);
            }
            if (!msg) {
                err = new Error('That message has expired or does not exist.');
                err.status = 404;
                return next(err);
            }
            var rawOrDirty = req.url.split('/')[1];
            res.render(rawOrDirty, {
                title: msg.subject || 'Message',
                message: msg
            });
        });
});

router.delete('/api/addresses/:email/messages/:id', function (req, res, next) {
    req.db.Message
        .remove({ _id: req.params.id })
        .exec(function (err, data) {
            if (err) {
                return next(err);
            }
            if (!data.result.n) {
                err = new Error('Message was not found.');
                err.status = 404;
                return next(err);
            }
            res.send({ message: 'Message was deleted.'});
        });
});

router.get('/api/addresses/:email/messages', function (req, res, next) {
    req.db.Message
    .find()
    .where('inbox', req.params.email)
    .select('inbox savedBy body text _id from subject received originalInbox')
    .exec(function (err, messages) {
        if (err) {
            err.status = 500;
            return next(err);
        }
        res.send(messages);
    });
});

router.get('/api/allmessages', function (req, res, next) {
    req.db.Message
    .find()
    .select('inbox savedBy body text _id from subject received originalInbox')
    .exec(function (err, messages) {
        if (err) {
            err.status = 500;
            return next(err);
        }
        res.send(messages);
    });
});

router.get('/api/delete/:email', function (req, res, next) {
    var data = "Empty";
    req.db.Message
        .remove({inbox: req.params.email})
        .exec(function (err, data) {
            if (err) {
                return next(err);    
            }
            if (!data.result.n) {
                err = new Error('Message was not found.');
                err.status = 404;
                
                return next(err);
            }
            res.send(data);
        });
});

module.exports = router;
