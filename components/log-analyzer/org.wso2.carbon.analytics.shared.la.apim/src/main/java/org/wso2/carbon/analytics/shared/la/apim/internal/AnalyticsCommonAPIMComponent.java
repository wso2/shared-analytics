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

package org.wso2.carbon.analytics.shared.la.apim.internal;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.osgi.service.component.ComponentContext;
import org.wso2.carbon.apimgt.impl.APIManagerConfigurationService;

/**
 * API Manager bridge component for Log Analyzer.
 *
 * @scr.component name="analytics.la.apim.component" immediate="true"
 * @scr.reference name="api.manager.config.service"
 * interface="org.wso2.carbon.apimgt.impl.APIManagerConfigurationService" cardinality="1..1"
 * policy="dynamic" bind="setAPIManagerConfigurationService" unbind="unsetAPIManagerConfigurationService"
 */
public class AnalyticsCommonAPIMComponent {

    private static final Log log = LogFactory.getLog(AnalyticsCommonAPIMComponent.class);

    private static APIManagerConfigurationService amConfigService;

    protected void activate(ComponentContext ctx) {

    }

    protected void deactivate(ComponentContext ctx) {

    }

    protected void setAPIManagerConfigurationService(APIManagerConfigurationService service) {
        log.debug("API manager configuration service bound to the API usage handler");
        amConfigService = service;
        ServiceReferenceHolder.getInstance().setAPIManagerConfigurationService(service);
    }

    protected void unsetAPIManagerConfigurationService(APIManagerConfigurationService service) {
        log.debug("API manager configuration service unbound from the API usage handler");
        amConfigService = null;
        ServiceReferenceHolder.getInstance().setAPIManagerConfigurationService(null);
    }
}
