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

package org.wso2.carbon.analytics.shared.la.apim;

import org.apache.synapse.ManagedLifecycle;
import org.apache.synapse.MessageContext;
import org.apache.synapse.core.SynapseEnvironment;
import org.apache.synapse.rest.AbstractHandler;
import org.wso2.carbon.analytics.shared.la.apim.internal.ServiceReferenceHolder;
import org.wso2.carbon.apimgt.impl.APIManagerConfiguration;
import org.wso2.carbon.apimgt.impl.APIManagerConfigurationService;

import java.nio.charset.Charset;
import java.util.List;

/**
 * Mediation handler used in proxy API for DAS REST API through APIM.
 * Provides basic authentication user name, password pair for REST API call.
 * Provides the DAS endpoint URL base.
 *
 */
public class DasProxyDetailsHandler extends AbstractHandler implements ManagedLifecycle {

    private static final String CONFIG_PROPERTY_DAS_RESTAPI_USERNAME = "Analytics.DASRestApiUsername";
    private static final String CONFIG_PROPERTY_DAS_RESTAPI_PASSWORD = "Analytics.DASRestApiPassword";
    private static final String CONFIG_PROPERTY_DAS_RESTAPI_URL = "Analytics.DASRestApiURL";

    private static final String MEDIATION_PROPERTY_DAS_RESTAPI_URL = "DAS.REST.URL";
    private static final String MEDIATION_PROPERTY_DAS_AUTHORIZATION = "DAS.authorization";

    private String analyticsServerRestUser = null;
    private String analyticsServerRestPassword = null;
    private String analyticsServerHostUrl = null;
    private String basicAuthString = null;

    @Override
    public boolean handleRequest(MessageContext messageContext) {
        messageContext.setProperty(MEDIATION_PROPERTY_DAS_RESTAPI_URL, analyticsServerHostUrl);
        messageContext.setProperty(MEDIATION_PROPERTY_DAS_AUTHORIZATION, basicAuthString);
        return true;
    }

    @Override
    public boolean handleResponse(MessageContext messageContext) {
        return true;
    }

    @Override
    public void init(SynapseEnvironment synapseEnvironment) {
        APIManagerConfigurationService apiManagerConfigurationService = ServiceReferenceHolder.getInstance()
                .getAPIManagerConfigurationService();
        if (apiManagerConfigurationService != null) {
            APIManagerConfiguration apiManagerConfiguration = apiManagerConfigurationService
                    .getAPIManagerConfiguration();
            if (apiManagerConfiguration != null) {
                analyticsServerRestUser = getPropertyValue(apiManagerConfiguration,
                        CONFIG_PROPERTY_DAS_RESTAPI_USERNAME);
                analyticsServerRestPassword = getPropertyValue(apiManagerConfiguration,
                        CONFIG_PROPERTY_DAS_RESTAPI_PASSWORD);
                analyticsServerHostUrl = getPropertyValue(apiManagerConfiguration, CONFIG_PROPERTY_DAS_RESTAPI_URL);

                String basicAuthUserPass = analyticsServerRestUser + ":" + analyticsServerRestPassword;
                byte[] bytes = basicAuthUserPass.getBytes(Charset.forName("utf-8"));
                byte[] encodedBytes = org.apache.commons.codec.binary.Base64.encodeBase64(bytes);
                basicAuthString = "Basic " + new String(encodedBytes);
            }
        }
    }

    @Override
    public void destroy() {

    }

    private String getPropertyValue(APIManagerConfiguration apiManagerConfiguration, String key) {
        List<String> values = apiManagerConfiguration.getProperty(key);
        if (values != null && values.size() > 0) {
            return values.get(0);
        }
        return null;
    }
}
