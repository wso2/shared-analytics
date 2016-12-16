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

import org.wso2.carbon.analytics.spark.core.udf.CarbonUDF;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Functions to extract message filtered by regex pattern
 */
public class RegExrUDF implements CarbonUDF {

    /**
     * This method is use for filtering string using regEx pattern and return
     * the result string value.
     *
     * @param message string which are required to matching.
     * @param regEx   regular expression for pattern matching.
     * @return string matching value for given message and return null if value not found.
     */
    public String getRegexMatch(String message, String regEx) {
        if (message == null || regEx == null) {
            return null;
        }
        Pattern pattern = Pattern.compile(regEx);
        Matcher matcher = pattern.matcher(message);

        if (matcher.find()) {
            return matcher.group(0);
        }
        return null;
    }
}
