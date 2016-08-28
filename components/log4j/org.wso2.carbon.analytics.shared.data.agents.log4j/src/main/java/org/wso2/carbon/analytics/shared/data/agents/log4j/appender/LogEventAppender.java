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

package org.wso2.carbon.analytics.shared.data.agents.log4j.appender;

import org.apache.log4j.Appender;
import org.apache.log4j.AppenderSkeleton;
import org.apache.log4j.Logger;
import org.apache.log4j.spi.LoggingEvent;
import org.wso2.carbon.analytics.shared.data.agents.log4j.appender.ds.LogAppenderServiceValueHolder;
import org.wso2.carbon.analytics.shared.data.agents.log4j.util.TenantAwarePatternLayout;
import org.wso2.carbon.context.CarbonContext;
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
import org.wso2.carbon.analytics.shared.data.agents.log4j.util.TenantDomainAwareLoggingEvent;
import org.wso2.carbon.utils.logging.handler.TenantDomainSetter;
import org.wso2.carbon.utils.multitenancy.MultitenantConstants;
import org.wso2.securevault.SecretResolver;
import org.wso2.securevault.SecretResolverFactory;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.security.AccessController;
import java.security.PrivilegedAction;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.List;
import java.util.Properties;
import java.util.Date;
import java.util.Map;
import java.util.HashMap;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * WSO2 carbon log appender for publishing tenant aware logging events to the DAS server.
 */
public class LogEventAppender extends AppenderSkeleton implements Appender {
    private static final Logger log = Logger.getLogger(LogEventAppender.class);
    private ArrayBlockingQueue<TenantDomainAwareLoggingEvent> loggingEvents;
    private String url;
    private String password;
    private String userName;
    private String instanceId;
    private String columnList;
    private int maxTolerableConsecutiveFailure;
    private int processingLimit = 100;
    private String streamDef;
    private String authURLs;
    private int tenantId;
    private String tenantDomain;
    private String serviceName;
    private String appName;
    private boolean isStackTrace = false;
    private static final String[] columns = {"serverName", "appName", "eventTimeStamp", "class", "level", "content", "ip",
            "instance", "trace"};
    private DataPublisher dataPublisher;
    private ScheduledExecutorService scheduler;
    private ConditionalLayoutWrapper tenantIDLayout = new ConditionalLayoutWrapper();
    private ConditionalLayoutWrapper tenantDomainLayout = new ConditionalLayoutWrapper();
    private ConditionalLayoutWrapper serverNameLayout = new ConditionalLayoutWrapper();
    private ConditionalLayoutWrapper appNameLayout = new ConditionalLayoutWrapper();
    private ConditionalLayoutWrapper logTimeLayout = new ConditionalLayoutWrapper();
    private ConditionalLayoutWrapper loggerLayout = new ConditionalLayoutWrapper();
    private ConditionalLayoutWrapper priorityLayout = new ConditionalLayoutWrapper();
    private ConditionalLayoutWrapper messageLayout = new ConditionalLayoutWrapper();
    private ConditionalLayoutWrapper ipLayout = new ConditionalLayoutWrapper();
    private ConditionalLayoutWrapper instanceLayout = new ConditionalLayoutWrapper();

    /**
     * Log appender activator option by log4j framework.
     */
    @Override
    public void activateOptions() {
        loggingEvents = new ArrayBlockingQueue<>(processingLimit);
        scheduler = Executors.newScheduledThreadPool(10);
        scheduler.scheduleWithFixedDelay(new LogPublisherTask(), 10, 10, TimeUnit.MILLISECONDS);
        serviceName = TenantDomainSetter.getServiceName();

        List<String> patterns = Arrays.asList(columnList.split(","));
        for (String pattern : patterns) {
            switch (pattern) {
                case "%D":
                    tenantDomainLayout.setWrappedLayout(new TenantAwarePatternLayout("%D"));
                    tenantDomainLayout.setEnable(true);
                    break;
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

    private void publisherInitializer() {
        Properties passwordProperty = new Properties();
        passwordProperty.put("log4j.appender.DAS_AGENT.password", password);
        SecretResolver secretResolver = SecretResolverFactory.create(passwordProperty);
        String secretAlias = "log4j.appender.DAS_AGENT.password";
        //Checking the log4j appender DAS credentials.
        if (secretResolver != null && secretResolver.isInitialized()) {
            if (secretResolver.isTokenProtected(secretAlias)) {
                password = secretResolver.resolve(secretAlias);
            } else {
                password = (String) passwordProperty.get(secretAlias);
            }
        }
        try {
            dataPublisher = new DataPublisher("Thrift", url, authURLs, userName, password);
        } catch (DataEndpointAgentConfigurationException e) {
            logError("Invalid urls passed for receiver and auth, and hence expected to fail "  + e.getMessage(), e);
        } catch (DataEndpointException e) {
            logError("Error while trying to publish events to data receiver " + e.getMessage(), e);
        } catch (DataEndpointConfigurationException e) {
            logError("Invalid urls passed for receiver and auth, and hence expected to fail " + e.getMessage(), e);
        } catch (DataEndpointAuthenticationException e) {
            logError("Error while trying to login to data receiver : " + e.getMessage(), e);
        } catch (TransportException e) {
            logError( "Thrift transport exception occurred " + e.getMessage(), e);
        }
    }

    /**
     * Log4j framework shutting down the log appender resources.
     */
    public void close() {
        if (scheduler != null) {
            scheduler.shutdown();
            try {
                scheduler.awaitTermination(10, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                logError("Interrupted while awaiting for Schedule Executor termination", null);
            }
        }
        try {
            if (dataPublisher != null) {
                dataPublisher.shutdown();
            }
        } catch (DataEndpointException e) {
            logError("Error in shutting down the data publisher " + e.getMessage(), e);
        }
    }

    /**
     * Append the log event by log4j framework.
     */
    @Override
    protected void append(LoggingEvent event) {
        // Checking the configuration context service for wait DAS appender until proper server initialization.
        if (LogAppenderServiceValueHolder.getConfigurationContextService() != null) {
            if (dataPublisher == null) {
                publisherInitializer();
            }

            Logger logger = Logger.getLogger(event.getLoggerName());
            TenantDomainAwareLoggingEvent tenantEvent;
            if (event.getThrowableInformation() != null) {
                tenantEvent = new TenantDomainAwareLoggingEvent(event.fqnOfCategoryClass, logger, event.timeStamp,
                        event.getLevel(), event.getMessage(), event.getThrowableInformation().getThrowable());
            } else {
                tenantEvent = new TenantDomainAwareLoggingEvent(event.fqnOfCategoryClass, logger, event.timeStamp,
                        event.getLevel(), event.getMessage(), null);
            }
            tenantId = AccessController.doPrivileged(new PrivilegedAction<Integer>() {
                public Integer run() {
                    return CarbonContext.getThreadLocalCarbonContext().getTenantId();
                }
            });

            tenantDomain = AccessController.doPrivileged(new PrivilegedAction<String>() {
                public String run() {
                    return CarbonContext.getThreadLocalCarbonContext().getTenantDomain();

                }
            });

           tenantEvent.setTenantDomain(tenantDomain);

            if (tenantId == MultitenantConstants.INVALID_TENANT_ID) {
                if (tenantDomain != null && !tenantDomain.equals("")) {
                    try {
                        tenantId = getTenantIdForDomain(tenantDomain);
                    } catch (UserStoreException e) {
                        logError("Cannot find tenant id for the given tenant domain.", e);
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
                logError("Logging events queue exceed the process limits", null);
            }
        }
    }


    public static void logError(String message, Throwable exception){
        System.err.println(message);
        if (exception != null) {
            exception.printStackTrace();
        }
    }

    /**
     * Retrieve the tenant domain.
     *
     * @param tenantDomain tenant domain name.
     * @return tenant id.
     * @throws UserStoreException
     */
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

    public String getInstanceId() {
        return instanceId;
    }

    public void setInstanceId(String instanceId) {
        this.instanceId = instanceId;
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
                    TenantDomainAwareLoggingEvent tenantDomainAwareLoggingEvent = loggingEvents.take();
                    publishLogEvent(tenantDomainAwareLoggingEvent);
                }
            } catch (Throwable t) {
                logError("FATAL: LogEventAppender Cannot publish log events", t);
                numOfConsecutiveFailures++;
                if (numOfConsecutiveFailures >= getMaxTolerableConsecutiveFailure()) {
                    logError("WARN: Number of consecutive log publishing failures reached the threshold of " +
                            getMaxTolerableConsecutiveFailure() + ". Purging log event array. Some logs will be lost.", null);
                    loggingEvents.clear();
                    numOfConsecutiveFailures = 0;
                }
            }
        }

        /**
         * Publishing the log event using thrift client.
         *
         * @param event log event which is wrapped TenantAwareLoggingEvent.
         * @throws ParseException
         */
        private void publishLogEvent(TenantDomainAwareLoggingEvent event) throws ParseException {
            String tenantID = tenantIDLayout.format(event);
            String tenantDomain = tenantDomainLayout.format(event);
            String serverName = serverNameLayout.format(event);
            String appName = appNameLayout.format(event);
            String logTime = logTimeLayout.format(event);
            String logger = loggerLayout.format(event);
            String priority = priorityLayout.format(event);
            String message = messageLayout.format(event);
            String ip = ipLayout.format(event);
            String instance = (getInstanceId() == null || getInstanceId().isEmpty()) ? instanceLayout.format(event) : getInstanceId() ;
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
            Event laEvent = new Event(streamDef, date.getTime(), null, null, new String[]{tenantDomain}, arbitraryDataMap);
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

        public String format(TenantDomainAwareLoggingEvent event) {
            if (isEnable) {
                return wrappedLayout.format(event);
            }
            return "";
        }
    }
}

