/*
 * Copyright 2018, alex at staticlibs.net
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define([
    "lodash/isEmpty",
    "lodash/isFunction",
    "lodash/isObject",
    "lodash/isString",
    "moment",
    "./authErrors",
    "./stringsEqual"
], function(isEmpty, isFunction, isObject, isString, moment, authErrors, stringsEqual) {
    "use strict";

    return function(loadUser, createRequest, createToken, request) {
        // check callbacks
        if (!isFunction(loadUser) || !isFunction(createRequest) || !isFunction(createToken)) {
            return {
                error: authErrors.INVALID_CALLBACK
            };
        }

        // check request well-formed
        if (!isObject(request) || 
                !request.hasOwnProperty("acessKey") || !isString(request.acessKey) || isEmpty(request.acessKey) ||
                !request.hasOwnProperty("hmac") || !isString(request.hmac) || isEmpty(request.hmac) ||
                !request.hasOwnProperty("timestamp") || !isString(request.timestamp) || isEmpty(request.timestamp) 
            ){
                return {
                    error: authErrors.REQUEST_NOT_WELL_FORMED
                };
            }
        
        // check ISO 8601 date format
        var reqDate = moment(request.timestamp, moment.ISO_8601, true);
        if (!reqDate.isValid()) {
            return {
                error: authErrors.INVALID_DATE_FORMAT
            };
        }
        
        // load user
        var user = loadUser(request.acessKey);
        if (!isObject(user)) {
            return {
                error: authErrors.USER_NOT_FOUND
            };
        }
        if (!user.hasOwnProperty("pwdHash") || !isString(user.pwdHash) || isEmpty(user.pwdHash)) {
            return {
                error: authErrors.INVALID_USER_LOADED,
                user: user
            };
        }

        // re-create request hash and compare it
        var localRequest = createRequest(
            '/auth',
            request.acessKey,
            user.pwdHash,
            request.timestamp
        )
        if (!stringsEqual(localRequest.hmac, request.hmac)) {
            return {
                error: authErrors.INVALID_REQUEST_HASH
            };
        }
        //create token here
        var token = createToken(user, request)
        return {
            sessionKey: token
        }
    };
});
