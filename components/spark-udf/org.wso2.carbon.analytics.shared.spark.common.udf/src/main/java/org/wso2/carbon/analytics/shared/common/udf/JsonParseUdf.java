/*
 * Copyright (c) 2016, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.wso2.carbon.analytics.shared.common.udf;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.json.JSONException;
import org.json.JSONObject;
import org.wso2.carbon.analytics.spark.core.udf.CarbonUDF;

/**
 * Functions to extract message filtered by json parser.
 */
public class JsonParseUdf implements CarbonUDF {

    private static final Log log = LogFactory.getLog(JsonParseUdf.class);

    /**
     * This method is use for parsing the json message and return
     * the value for given key.
     *
     * @param jsonString json string which are required to parsing.
     * @param key        json string search key for parser.
     * @return string value for given key and return null if value not found.
     */
    public String parseJson(String jsonString, String key) {
        String result = null;
        try {
            JSONObject jsonObject = new JSONObject(jsonString);
            result = jsonObject.get(key).toString();
        } catch (JSONException e) {
            log.error("Error while parsing the JSON string " + e.getMessage(), e);
        }
        return result;
    }
}
