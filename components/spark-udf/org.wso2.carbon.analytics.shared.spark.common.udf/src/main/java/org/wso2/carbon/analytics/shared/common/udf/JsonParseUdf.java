package org.wso2.carbon.analytics.shared.common.udf;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.json.JSONException;
import org.json.JSONObject;
import org.wso2.carbon.analytics.spark.core.udf.CarbonUDF;

/**
 * Created by sajith on 8/4/16.
 */
public class JsonParseUdf implements CarbonUDF {

    private static final Log log = LogFactory.getLog(JsonParseUdf.class);

    public String parseJson(String jsonString, String key){
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
