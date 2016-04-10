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

package org.wso2.carbon.data.agents.log4j.appender;


import org.apache.log4j.Appender;
import org.apache.log4j.AppenderSkeleton;
import org.apache.log4j.Logger;
import org.apache.log4j.spi.LoggingEvent;
import org.wso2.carbon.base.ServerConfiguration;
import org.wso2.carbon.context.CarbonContext;
import org.wso2.carbon.data.agents.log4j.util.TenantAwarePatternLayout;
import org.wso2.carbon.databridge.agent.DataPublisher;
import org.wso2.carbon.databridge.agent.exception.DataEndpointAgentConfigurationException;
import org.wso2.carbon.databridge.agent.exception.DataEndpointAuthenticationException;
import org.wso2.carbon.databridge.agent.exception.DataEndpointConfigurationException;
import org.wso2.carbon.databridge.agent.exception.DataEndpointException;
import org.wso2.carbon.databridge.commons.Event;
import org.wso2.carbon.databridge.commons.exception.*;
import org.wso2.carbon.logging.service.internal.LoggingServiceComponent;
import org.wso2.carbon.logging.service.util.LoggingConstants;
import org.wso2.carbon.user.api.UserStoreException;
import org.wso2.carbon.user.core.tenant.TenantManager;
import org.wso2.carbon.utils.CarbonUtils;
import org.wso2.carbon.utils.logging.LoggingUtils;
import org.wso2.carbon.utils.logging.TenantAwareLoggingEvent;
import org.wso2.carbon.utils.logging.handler.TenantDomainSetter;
import org.wso2.carbon.utils.multitenancy.MultitenantConstants;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.net.MalformedURLException;
import java.security.AccessController;
import java.security.PrivilegedAction;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.*;
import java.util.logging.LogRecord;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class LogEventAppender extends AppenderSkeleton implements Appender {
    private static final Logger log = Logger.getLogger(LogEventAppender.class);
    private final List<TenantAwareLoggingEvent> loggingEvents = new CopyOnWriteArrayList<>();
    private String url;
    private String password;
    private String userName;
    private String columnList;
    private String port;
    private int maxTolerableConsecutiveFailure;
    private int processingLimit = 100;
    private String streamDef;
    private String trustStorePassword;
    private String truststorePath;
    private String authURLSet;
    private static final String[] columns = {"serverName", "appName", "eventTimeStamp", "class", "level", "message", "ip",
            "instance", "trace"};
    private boolean isTruststore = false;

    public LogEventAppender() {
        init();
    }

    /**
     * init will get called to initialize agent and start scheduling.
     */
    public void init() {
        ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(10);
        scheduler.scheduleWithFixedDelay(new LogPublisherTask(), 10, 10, TimeUnit.MILLISECONDS);
    }

    private String getCurrentServerName() {
        String serverName = ServerConfiguration.getInstance().getFirstProperty("ServerKey");
        return serverName;
    }

    private String getCurrentDate() {
        Date now = new Date();
        DateFormat formatter = new SimpleDateFormat(LoggingConstants.DATE_FORMATTER);
        String formattedDate = formatter.format(now);
        return formattedDate.replace("-", ".");
    }

    private String getStacktrace(Throwable e) {
        StringWriter stringWriter = new StringWriter();
        e.printStackTrace(new PrintWriter(stringWriter));
        return stringWriter.toString().trim();
    }

    public void close() {

    }

    public void push(LogRecord record) {
        LoggingEvent loggingEvent = LoggingUtils.getLogEvent(record);
        append(loggingEvent);
    }

    @Override
    protected void append(LoggingEvent event) {
        if (!isTruststore) {
            truststorePath = CarbonUtils.getCarbonHome() + truststorePath;
            System.setProperty("javax.net.ssl.trustStore", truststorePath);
            System.setProperty("javax.net.ssl.trustStorePassword", "wso2carbon");
            isTruststore = true;
        }
        Logger logger = Logger.getLogger(event.getLoggerName());
        TenantAwareLoggingEvent tenantEvent;
        if (event.getThrowableInformation() != null) {
            tenantEvent = new TenantAwareLoggingEvent(event.fqnOfCategoryClass, logger, event.timeStamp,
                    event.getLevel(), event.getMessage(), event.getThrowableInformation().getThrowable());
        } else {
            tenantEvent = new TenantAwareLoggingEvent(event.fqnOfCategoryClass, logger, event.timeStamp,
                    event.getLevel(), event.getMessage(), null);
        }
        int tenantId = AccessController.doPrivileged(new PrivilegedAction<Integer>() {
            public Integer run() {
                return CarbonContext.getThreadLocalCarbonContext().getTenantId();
            }
        });
        if (tenantId == MultitenantConstants.INVALID_TENANT_ID) {
            String tenantDomain = TenantDomainSetter.getTenantDomain();
            if (tenantDomain != null && !tenantDomain.equals("")) {
                try {
                    tenantId = getTenantIdForDomain(tenantDomain);
                } catch (UserStoreException e) {
                    System.err.println("Cannot find tenant id for the given tenant domain.");
                    e.printStackTrace();
                }
            }
        }
        tenantEvent.setTenantId(String.valueOf(tenantId));
        String serviceName = TenantDomainSetter.getServiceName();
        String appName = CarbonContext.getThreadLocalCarbonContext().getApplicationName();
        if (appName != null) {
            tenantEvent.setServiceName(CarbonContext.getThreadLocalCarbonContext().getApplicationName());
        } else if (serviceName != null) {
            tenantEvent.setServiceName(serviceName);
        } else {
            tenantEvent.setServiceName("");
        }
        loggingEvents.add(tenantEvent);
    }

    public int getTenantIdForDomain(String tenantDomain) throws UserStoreException {
        int tenantId;
        TenantManager tenantManager = LoggingServiceComponent.getTenantManager();
        if (tenantDomain == null || tenantDomain.equals("")) {
            tenantId = MultitenantConstants.SUPER_TENANT_ID;
        } else {
            tenantId = tenantManager.getTenantId(tenantDomain);
        }
        return tenantId;
    }

    public boolean requiresLayout() {
        return false;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getColumnList() {
        return columnList;
    }

    public void setColumnList(String columnList) {
        this.columnList = columnList;
    }

    public int getMaxTolerableConsecutiveFailure() {
        return maxTolerableConsecutiveFailure;
    }

    public String getStreamDef() {
        return streamDef;
    }

    public void setStreamDef(String streamDef) {
        this.streamDef = streamDef;
    }

    public void setMaxTolerableConsecutiveFailure(int maxTolerableConsecutiveFailure) {
        this.maxTolerableConsecutiveFailure = maxTolerableConsecutiveFailure;
    }

    public int getProcessingLimit() {
        return processingLimit;
    }

    public void setProcessingLimit(int processingLimit) {
        this.processingLimit = processingLimit;
    }

    public String getTrustStorePassword() {
        return trustStorePassword;
    }

    public void setTrustStorePassword(String trustStorePassword) {
        this.trustStorePassword = trustStorePassword;
    }

    public String getTruststorePath() {
        return truststorePath;
    }

    public void setTruststorePath(String truststorePath) {
        this.truststorePath = truststorePath;
    }

    public void setPort(String port) {
        this.port = port;
    }

    private final class LogPublisherTask implements Runnable {
        private int numOfConsecutiveFailures;
        private DataPublisher dataPublisher;

        public void run() {
            try {
                for (int i = 0; i < loggingEvents.size(); i++) {
                    TenantAwareLoggingEvent tenantAwareLoggingEvent = loggingEvents.get(i);
                    if (i >= processingLimit) {
                        return;
                    }
                    publishLogEvent(tenantAwareLoggingEvent);
                    loggingEvents.remove(i);
                }
            } catch (Throwable t) {
                System.err.println("FATAL: LogEventAppender Cannot publish log events");
                t.printStackTrace();
                numOfConsecutiveFailures++;
                if (numOfConsecutiveFailures >= getMaxTolerableConsecutiveFailure()) {
                    System.err.println("WARN: Number of consecutive log publishing failures reached the threshold of " +
                            getMaxTolerableConsecutiveFailure() + ". Purging log event array. Some logs will be lost.");
                    loggingEvents.clear();
                    numOfConsecutiveFailures = 0;
                }
            }
        }

        private void publishLogEvent(TenantAwareLoggingEvent event) throws ParseException {
            String streamId = "";
            String streamName = "";
            String tenantId = event.getTenantId();
            if (tenantId.equals(String.valueOf(MultitenantConstants.INVALID_TENANT_ID)) || tenantId
                    .equals(String.valueOf(MultitenantConstants.SUPER_TENANT_ID))) {
                tenantId = "0";
            }
            String serverKey = getCurrentServerName();
            String currDateStr = getCurrentDate();
            try {
                Pattern pattern = Pattern.compile("(tcp):\\/\\/([a-zA-Z0-9]+):([0-9]+)");
                Matcher matcher = pattern.matcher(url);
                if (matcher.find() && authURLSet == null) {
                    authURLSet = "ssl://" + matcher.group(2).toString() + ":" + (
                            Integer.parseInt(matcher.group(3).toString()) + 100);
                }
                dataPublisher = new DataPublisher("Thrift", url, authURLSet, userName, password);
            } catch (DataEndpointAgentConfigurationException e) {
                log.error(
                        "Invalid urls passed for receiver and auth, and hence expected to fail " + e
                                .getMessage(), e);
            } catch (DataEndpointException e) {
                log.error(
                        "Invalid urls passed for receiver and auth, and hence expected to fail " + e
                                .getMessage(), e);
            } catch (DataEndpointConfigurationException e) {
                log.error(
                        "Invalid urls passed for receiver and auth, and hence expected to fail " + e
                                .getMessage(), e);
            } catch (DataEndpointAuthenticationException e) {
                log.error(
                        "Invalid urls passed for receiver and auth, and hence expected to fail " + e
                                .getMessage(), e);
            } catch (TransportException e) {
                log.error(
                        "Invalid urls passed for receiver and auth, and hence expected to fail " + e
                                .getMessage(), e);
            }
            List<String> patterns = Arrays.asList(columnList.split(","));
            String tenantID = "";
            String serverName = "";
            String appName = "";
            String logTime = "";
            String logger = "";
            String priority = "";
            String message = "";
            String stacktrace = "";
            String ip = "";
            String instance = "";
            for (String pattern : patterns) {
                String currEle = (pattern);
                TenantAwarePatternLayout patternLayout = new TenantAwarePatternLayout(currEle);
                if (currEle.equals("%T")) {
                    tenantID = patternLayout.format(event);
                    continue;
                }
                if (currEle.equals("%S")) {
                    serverName = patternLayout.format(event);
                    continue;
                }
                if (currEle.equals("%A")) {
                    appName = patternLayout.format(event);
                    if (appName == null || appName.equals("")) {
                        appName = "";
                    }
                    continue;
                }
                if (currEle.equals("%d")) {

                    logTime = patternLayout.format(event);
                    continue;
                }
                if (currEle.equals("%c")) {
                    logger = patternLayout.format(event);
                    continue;
                }
                if (currEle.equals("%p")) {
                    priority = patternLayout.format(event);
                    continue;
                }
                if (currEle.equals("%m")) {
                    message = patternLayout.format(event);
                    continue;
                }
                if (currEle.equals("%H")) {
                    ip = patternLayout.format(event);
                    continue;
                }
                if (currEle.equals("%I")) {
                    instance = patternLayout.format(event);
                    continue;
                }
                if (currEle.equals("%Stacktrace")) {
                    if (event.getThrowableInformation() != null) {
                        stacktrace = getStacktrace(event.getThrowableInformation().getThrowable());
                    } else {
                        stacktrace = "";
                    }
                }
            }
            Date date;
            DateFormat formatter;
            formatter = new SimpleDateFormat(LoggingConstants.DATE_TIME_FORMATTER);
            date = formatter.parse(logTime);
            List<String> payLoadData = Arrays.asList(tenantID);
            Map<String, String> arbitraryDataMap = new HashMap<String, String>();
            arbitraryDataMap.put(columns[0], serverName);
            arbitraryDataMap.put(columns[1], appName);
            arbitraryDataMap.put(columns[2], String.valueOf(date.getTime()));
            arbitraryDataMap.put(columns[3], logger);
            arbitraryDataMap.put(columns[4], priority);
            arbitraryDataMap.put(columns[5], message);
            arbitraryDataMap.put(columns[6], ip);
            arbitraryDataMap.put(columns[7], instance);
            if (event.getThrowableInformation() != null) {
                arbitraryDataMap.put(columns[8], stacktrace);
            }
            if (payLoadData != null && arbitraryDataMap != null) {
                Event laEvent = new Event(streamDef, System.currentTimeMillis(), null, null,
                        payLoadData.toArray(), arbitraryDataMap);
                dataPublisher.publish(laEvent);
            }
        }
    }
}

