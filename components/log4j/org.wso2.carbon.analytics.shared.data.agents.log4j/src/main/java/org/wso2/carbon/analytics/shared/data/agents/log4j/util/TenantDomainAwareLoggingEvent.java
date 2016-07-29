/*
 *  Copyright (c) 2005-2009, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 *  WSO2 Inc. licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 *
 */
package org.wso2.carbon.analytics.shared.data.agents.log4j.util;

import org.apache.log4j.Category;
import org.apache.log4j.Priority;
import org.wso2.carbon.utils.logging.TenantAwareLoggingEvent;
/**
 * This class is used to store information regarding a LogEvent along with tenant domain information.
 */
public class TenantDomainAwareLoggingEvent extends TenantAwareLoggingEvent {

    private String tenantDomain;

    private static final long serialVersionUID = 1L;

    public TenantDomainAwareLoggingEvent(String fqnOfCategoryClass, Category logger, long timeStamp,
                                   Priority level, Object message, Throwable throwable) {
        super(fqnOfCategoryClass, logger, timeStamp, level, message, throwable);

    }
    public String getTenantDomain() {
        return tenantDomain;
    }

    public void setTenantDomain(String tenantDomain) {
        this.tenantDomain = tenantDomain;
    }
}