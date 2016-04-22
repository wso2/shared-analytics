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
import org.wso2.carbon.context.CarbonContext;
import org.wso2.carbon.data.agents.log4j.util.TenantAwarePatternLayout;
import org.wso2.carbon.databridge.agent.DataPublisher;
import org.wso2.carbon.databridge.agent.exception.DataEndpointAgentConfigurationException;
import org.wso2.carbon.databridge.agent.exception.DataEndpointAuthenticationException;
import org.wso2.carbon.databridge.agent.exception.DataEndpointConfigurationException;
import org.wso2.carbon.databridge.agent.exception.DataEndpointException;
import org.wso2.carbon.databridge.commons.Event;
import org.wso2.carbon.databridge.commons.exception.TransportException;
import org.wso2.carbon.logging.service.internal.LoggingServiceComponent;
import org.wso2.carbon.logging.service.util.LoggingConstants;
import org.wso2.carbon.user.api.UserStoreException;
import org.wso2.carbon.user.core.tenant.TenantManager;
import org.wso2.carbon.utils.CarbonUtils;
import org.wso2.carbon.utils.logging.TenantAwareLoggingEvent;
import org.wso2.carbon.utils.logging.handler.TenantDomainSetter;
import org.wso2.carbon.utils.multitenancy.MultitenantConstants;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.security.AccessController;
import java.security.PrivilegedAction;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class LogEventAppender extends AppenderSkeleton implements Appender {
    private static final Logger log = Logger.getLogger(LogEventAppender.class);
    private ArrayBlockingQueue<TenantAwareLoggingEvent> loggingEvents;
    private String url;
    private String password;
    private String userName;
    private String columnList;
    private int maxTolerableConsecutiveFailure;
    private int processingLimit = 100;
    private String streamDef;
    private String truststorePath;
    private String authURLs;
    private int tenantId;
    private String serviceName;
    private String appName;
    private boolean isStackTrace = false;
    private static final String[] columns = {"serverName", "appName", "eventTimeStamp", "class", "level", "content", "ip",
            "instance", "trace"};
    private DataPublisher dataPublisher;
    private ScheduledExecutorService scheduler;
    private ConditionalLayoutWrapper tenantIDLayout = new ConditionalLayoutWrapper();
    private ConditionalLayoutWrapper serverNameLayout = new ConditionalLayoutWrapper();
    private ConditionalLayoutWrapper appNameLayout = new ConditionalLayoutWrapper();
    private ConditionalLayoutWrapper logTimeLayout = new ConditionalLayoutWrapper();
    private ConditionalLayoutWrapper loggerLayout = new ConditionalLayoutWrapper();
    private ConditionalLayoutWrapper priorityLayout = new ConditionalLayoutWrapper();
    private ConditionalLayoutWrapper messageLayout = new ConditionalLayoutWrapper();
    private ConditionalLayoutWrapper ipLayout = new ConditionalLayoutWrapper();
    private ConditionalLayoutWrapper instanceLayout = new ConditionalLayoutWrapper();


    @Override
    public void activateOptions() {
        loggingEvents = new ArrayBlockingQueue<>(processingLimit);
        scheduler = Executors.newScheduledThreadPool(10);
        scheduler.scheduleWithFixedDelay(new LogPublisherTask(), 10, 10, TimeUnit.MILLISECONDS);

        truststorePath = CarbonUtils.getCarbonHome() + truststorePath;
        System.setProperty("javax.net.ssl.trustStore", truststorePath);
        System.setProperty("javax.net.ssl.trustStorePassword", "wso2carbon");
        serviceName = TenantDomainSetter.getServiceName();

        try {
            dataPublisher = new DataPublisher("Thrift", url, authURLs, userName, password);
        } catch (DataEndpointAgentConfigurationException e) {
            log.error(
                    "Invalid urls passed for receiver and auth, and hence expected to fail " + e
                            .getMessage(), e);
        } catch (DataEndpointException e) {
            log.error(
                    "Error while trying to publish events to data receiver " + e
                            .getMessage(), e);
        } catch (DataEndpointConfigurationException e) {
            log.error(
                    "Invalid urls passed for receiver and auth, and hence expected to fail " + e
                            .getMessage(), e);
        } catch (DataEndpointAuthenticationException e) {
            log.error(
                    "Error while trying to login to data receiver : " + e
                            .getMessage(), e);
        } catch (TransportException e) {
            log.error(
                    "Thrift transport exception occurred " + e
                            .getMessage(), e);
        }

        List<String> patterns = Arrays.asList(columnList.split(","));
        for (String pattern : patterns) {
            switch (pattern) {
                case "%T":
                    tenantIDLayout.setWrappedLayout(new TenantAwarePatternLayout("%T"));
                    tenantIDLayout.setEnable(true);
                    break;
                case "%S":
                    serverNameLayout.setWrappedLayout(new TenantAwarePatternLayout("%S"));
                    serverNameLayout.setEnable(true);
                    break;
                case "%A":
                    appNameLayout.setWrappedLayout(new TenantAwarePatternLayout("%A"));
                    appNameLayout.setEnable(true);
                    break;
                case "%d":
                    logTimeLayout.setWrappedLayout(new TenantAwarePatternLayout("%d"));
                    logTimeLayout.setEnable(true);
                    break;
                case "%c":
                    loggerLayout.setWrappedLayout(new TenantAwarePatternLayout("%c"));
                    loggerLayout.setEnable(true);
                    break;
                case "%p":
                    priorityLayout.setWrappedLayout(new TenantAwarePatternLayout("%p"));
                    priorityLayout.setEnable(true);
                    break;
                case "%m":
                    messageLayout.setWrappedLayout(new TenantAwarePatternLayout("%m"));
                    messageLayout.setEnable(true);
                    break;
                case "%H":
                    ipLayout.setWrappedLayout(new TenantAwarePatternLayout("%H"));
                    ipLayout.setEnable(true);
                    break;
                case "%I":
                    instanceLayout.setWrappedLayout(new TenantAwarePatternLayout("%I"));
                    instanceLayout.setEnable(true);
                    break;
                case "%Stacktrace":
                    isStackTrace = true;
                    break;
            }
        }
    }

    public void close() {
        if(scheduler != null) {
            scheduler.shutdown();
            try {
                scheduler.awaitTermination(10, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                log.warn("Interrupted while awaiting for Schedule Executor termination");
            }
        }
        try {
            if (dataPublisher != null) {
                dataPublisher.shutdown();
            }
        } catch (DataEndpointException e) {
            log.error("Error in shutting down the data publisher " + e.getMessage(), e);
        }
    }

    @Override
    protected void append(LoggingEvent event) {
        Logger logger = Logger.getLogger(event.getLoggerName());
        TenantAwareLoggingEvent tenantEvent;
        if (event.getThrowableInformation() != null) {
            tenantEvent = new TenantAwareLoggingEvent(event.fqnOfCategoryClass, logger, event.timeStamp,
                    event.getLevel(), event.getMessage(), event.getThrowableInformation().getThrowable());
        } else {
            tenantEvent = new TenantAwareLoggingEvent(event.fqnOfCategoryClass, logger, event.timeStamp,
                    event.getLevel(), event.getMessage(), null);
        }
        tenantId = AccessController.doPrivileged(new PrivilegedAction<Integer>() {
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
        appName = CarbonContext.getThreadLocalCarbonContext().getApplicationName();
        tenantEvent.setTenantId(String.valueOf(tenantId));
        if (appName != null) {
            tenantEvent.setServiceName(CarbonContext.getThreadLocalCarbonContext().getApplicationName());
        } else if (serviceName != null) {
            tenantEvent.setServiceName(serviceName);
        } else {
            tenantEvent.setServiceName("");
        }
        if (!loggingEvents.offer(tenantEvent)) {
            log.warn("Logging events queue exceed the process limits");
        }
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

    private String getStacktrace(Throwable e) {
        StringWriter stringWriter = new StringWriter();
        e.printStackTrace(new PrintWriter(stringWriter));
        return stringWriter.toString().trim();
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

    public String getTruststorePath() {
        return truststorePath;
    }

    public void setTruststorePath(String truststorePath) {
        this.truststorePath = truststorePath;
    }

    public String getAuthURLs() {
        return authURLs;
    }

    public void setAuthURLs(String authURLs) {
        this.authURLs = authURLs;
    }


    private final class LogPublisherTask implements Runnable {
        private int numOfConsecutiveFailures;

        public void run() {
            try {
                for (int i = 0; i < loggingEvents.size(); i++) {
                    TenantAwareLoggingEvent tenantAwareLoggingEvent = loggingEvents.take();
                    publishLogEvent(tenantAwareLoggingEvent);
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
            String tenantID = tenantIDLayout.format(event);
            String serverName = serverNameLayout.format(event);
            String appName = appNameLayout.format(event);
            String logTime = logTimeLayout.format(event);
            String logger = loggerLayout.format(event);
            String priority = priorityLayout.format(event);
            String message = messageLayout.format(event);
            String ip = ipLayout.format(event);
            String instance = instanceLayout.format(event);
            String stacktrace = "";

            if (isStackTrace) {
                if (event.getThrowableInformation() != null) {
                    stacktrace = getStacktrace(event.getThrowableInformation().getThrowable());
                } else {
                    stacktrace = "";
                }
            }
            Date date;
            DateFormat formatter;
            formatter = new SimpleDateFormat(LoggingConstants.DATE_TIME_FORMATTER);
            date = formatter.parse(logTime);
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
            Event laEvent = new Event(streamDef, System.currentTimeMillis(), null, null, new String[]{tenantID}, arbitraryDataMap);
            dataPublisher.publish(laEvent);
        }
    }

    private static class ConditionalLayoutWrapper {
        TenantAwarePatternLayout wrappedLayout;
        boolean isEnable;

        public void setWrappedLayout(TenantAwarePatternLayout wrappedLayout) {
            this.wrappedLayout = wrappedLayout;
        }

        public void setEnable(boolean enable) {
            isEnable = enable;
        }

        public String format(TenantAwareLoggingEvent event) {
            if (isEnable) {
                return wrappedLayout.format(event);
            }
            return "";
        }
    }
}

