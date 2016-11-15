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
import org.apache.log4j.helpers.LogLog;
import org.apache.log4j.spi.LoggingEvent;
import org.apache.log4j.spi.ThrowableInformation;
import org.wso2.carbon.analytics.shared.data.agents.log4j.appender.ds.LogAppenderServiceValueHolder;
import org.wso2.carbon.analytics.shared.data.agents.log4j.util.TenantAwarePatternLayout;
import org.wso2.carbon.context.CarbonContext;
import org.wso2.carbon.context.PrivilegedCarbonContext;
import org.wso2.carbon.databridge.agent.DataPublisher;
import org.wso2.carbon.databridge.agent.exception.DataEndpointAgentConfigurationException;
import org.wso2.carbon.databridge.agent.exception.DataEndpointAuthenticationException;
import org.wso2.carbon.databridge.agent.exception.DataEndpointConfigurationException;
import org.wso2.carbon.databridge.agent.exception.DataEndpointException;
import org.wso2.carbon.databridge.commons.Event;
import org.wso2.carbon.databridge.commons.exception.TransportException;
import org.wso2.carbon.logging.service.util.LoggingConstants;
import org.wso2.carbon.analytics.shared.data.agents.log4j.util.TenantDomainAwareLoggingEvent;
import org.wso2.carbon.utils.logging.handler.TenantDomainSetter;
import org.wso2.securevault.SecretResolver;
import org.wso2.securevault.SecretResolverFactory;

import java.io.PrintWriter;
import java.io.StringWriter;
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
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * WSO2 carbon log appender for publishing tenant aware logging events to the DAS server.
 */
public class LogEventAppender extends AppenderSkeleton implements Appender {
    private static final String[] COLUMNS = {"serverName", "appName", "eventTimeStamp", "class", "level", "content", "ip",
            "instance", "trace"};
    private static final String SECRET_ALIAS = "log4j.appender.DAS_AGENT.password";
    private BlockingQueue<TenantDomainAwareLoggingEvent> loggingEvents;
    private String url;
    private String password;
    private String userName;
    private String instanceId;
    private String columnList;
    private int maxTolerableConsecutiveFailure;
    private int processingLimit = 100;
    private String streamDef;
    private String authURLs;
    private String protocol;
    private String serviceName;
    private boolean isStackTrace = false;
    private boolean isFirstEvent = true;
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
    private int failedCount;

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
                    tenantDomainLayout.setEnabled(true);
                    break;
                case "%T":
                    tenantIDLayout.setWrappedLayout(new TenantAwarePatternLayout("%T"));
                    tenantIDLayout.setEnabled(true);
                    break;
                case "%S":
                    serverNameLayout.setWrappedLayout(new TenantAwarePatternLayout("%S"));
                    serverNameLayout.setEnabled(true);
                    break;
                case "%A":
                    appNameLayout.setWrappedLayout(new TenantAwarePatternLayout("%A"));
                    appNameLayout.setEnabled(true);
                    break;
                case "%d":
                    logTimeLayout.setWrappedLayout(new TenantAwarePatternLayout("%d"));
                    logTimeLayout.setEnabled(true);
                    break;
                case "%c":
                    loggerLayout.setWrappedLayout(new TenantAwarePatternLayout("%c"));
                    loggerLayout.setEnabled(true);
                    break;
                case "%p":
                    priorityLayout.setWrappedLayout(new TenantAwarePatternLayout("%p"));
                    priorityLayout.setEnabled(true);
                    break;
                case "%m":
                    messageLayout.setWrappedLayout(new TenantAwarePatternLayout("%m"));
                    messageLayout.setEnabled(true);
                    break;
                case "%H":
                    ipLayout.setWrappedLayout(new TenantAwarePatternLayout("%H"));
                    ipLayout.setEnabled(true);
                    break;
                case "%I":
                    instanceLayout.setWrappedLayout(new TenantAwarePatternLayout("%I"));
                    instanceLayout.setEnabled(true);
                    break;
                case "%Stacktrace":
                    isStackTrace = true;
                    break;
                default:
                    break;
            }
        }
    }

    private void publisherInitializer() {
        resolveSecretPassword();
        try {
            dataPublisher = new DataPublisher(protocol, url, authURLs, userName, password);
        } catch (DataEndpointAgentConfigurationException e) {
            LogLog.error("Invalid urls passed for receiver and auth, and hence expected to fail for data agent " + e
                    .getMessage(), e);
        } catch (DataEndpointException e) {
            LogLog.error("Error while trying to publish events to data receiver " + e.getMessage(), e);
        } catch (DataEndpointConfigurationException e) {
            LogLog.error("Invalid urls passed for receiver and auth, and hence expected to fail for data endpoint " + e
                    .getMessage(), e);
        } catch (DataEndpointAuthenticationException e) {
            LogLog.error("Error while trying to login to data receiver : " + e.getMessage(), e);
        } catch (TransportException e) {
            LogLog.error("Thrift transport exception occurred " + e.getMessage(), e);
        }
    }

    /**
     * Password is configured in log4j properties, either in plain text or alias. Resolves the correct real password
     * in either case.
     */
    private void resolveSecretPassword() {
        Properties passwordProperty = new Properties();
        passwordProperty.put(SECRET_ALIAS, password);
        SecretResolver secretResolver = SecretResolverFactory.create(passwordProperty);
        //Checking the log4j appender DAS credentials.
        if (secretResolver != null && secretResolver.isInitialized()) {
            if (secretResolver.isTokenProtected(SECRET_ALIAS)) {
                password = secretResolver.resolve(SECRET_ALIAS);
            }
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
                LogLog.error("Interrupted while awaiting for Schedule Executor termination" + e.getMessage(), e);
            }
        }
        try {
            if (dataPublisher != null) {
                dataPublisher.shutdown();
            }
        } catch (DataEndpointException e) {
            LogLog.error("Error in shutting down the data publisher " + e.getMessage(), e);
        }
    }

    /**
     * Append the log event by log4j framework.
     */
    @Override
    protected void append(LoggingEvent event) {
        // Checking the configuration context service for wait DAS appender until proper server initialization.
        if (LogAppenderServiceValueHolder.getConfigurationContextService() != null) {
            if (isFirstEvent) {
                publisherInitializer();
                isFirstEvent = false;
            }

            if (dataPublisher != null) {
                Logger logger = Logger.getLogger(event.getLoggerName());
                ThrowableInformation throwableInformation = event.getThrowableInformation();
                TenantDomainAwareLoggingEvent tenantEvent = new TenantDomainAwareLoggingEvent(event.fqnOfCategoryClass,
                        logger, event.timeStamp, event.getLevel(), event.getMessage(),
                        (throwableInformation != null) ? throwableInformation.getThrowable() : null);

                int tenantId = PrivilegedCarbonContext.getThreadLocalCarbonContext().getTenantId(true);
                tenantEvent.setTenantId(String.valueOf(tenantId));
                String tenantDomain = PrivilegedCarbonContext.getThreadLocalCarbonContext().getTenantDomain(true);
                tenantEvent.setTenantDomain(tenantDomain);
                String appName = CarbonContext.getThreadLocalCarbonContext().getApplicationName();
                if (appName != null) {
                    tenantEvent.setServiceName(appName);
                } else if (serviceName != null) {
                    tenantEvent.setServiceName(serviceName);
                } else {
                    tenantEvent.setServiceName("");
                }
                if (!loggingEvents.offer(tenantEvent)) {
                    if (++failedCount % 1000 == 0) {
                        LogLog.warn("Logging events queue exceed the process limits " + processingLimit + ", dropping the " +
                                "log event.");
                    }
                }
            }
        }
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

    public void setProtocol(String protocol) {
        this.protocol = protocol;
    }

    private final class LogPublisherTask implements Runnable {
        public void run() {
            try {
                while (!loggingEvents.isEmpty()) {
                    if (dataPublisher != null) {
                        try {
                            publishLogEvent(loggingEvents.take());
                        } catch (ParseException e) {
                            LogLog.error("LogEventAppender Cannot publish log event, " + e.getMessage(), e);
                        }
                    }
                }
            } catch (InterruptedException e) {
                LogLog.error("LogEventAppender Cannot publish log events, " + e.getMessage(), e);
            }
        }

        /**
         * Publishing the log event using thrift client.
         *
         * @param event log event which is wrapped TenantAwareLoggingEvent.
         * @throws ParseException signals that an error has been reached unexpectedly while parsing.
         */
        private void publishLogEvent(TenantDomainAwareLoggingEvent event) throws ParseException {
            String tenantDomain = tenantDomainLayout.format(event);
            if (tenantDomain == null || tenantDomain.isEmpty()) {
                tenantDomain = "[Not Available]";
            }
            String serverName = serverNameLayout.format(event);
            String appName = appNameLayout.format(event);
            String logTime = logTimeLayout.format(event);
            String logger = loggerLayout.format(event);
            String priority = priorityLayout.format(event);
            String message = messageLayout.format(event);
            String ip = ipLayout.format(event);
            String instance = (getInstanceId() == null || getInstanceId().isEmpty()) ? instanceLayout.format(event) :
                    getInstanceId();
            String stacktrace = "";

            if (isStackTrace) {
                if (event.getThrowableInformation() != null) {
                    stacktrace = getStacktrace(event.getThrowableInformation().getThrowable());
                }
            }
            DateFormat formatter = new SimpleDateFormat(LoggingConstants.DATE_TIME_FORMATTER);
            Date date = formatter.parse(logTime);
            Map<String, String> arbitraryDataMap = new HashMap<String, String>();
            arbitraryDataMap.put(COLUMNS[0], serverName);
            arbitraryDataMap.put(COLUMNS[1], appName);
            arbitraryDataMap.put(COLUMNS[2], String.valueOf(date.getTime()));
            arbitraryDataMap.put(COLUMNS[3], logger);
            arbitraryDataMap.put(COLUMNS[4], priority);
            arbitraryDataMap.put(COLUMNS[5], message);
            arbitraryDataMap.put(COLUMNS[6], ip);
            arbitraryDataMap.put(COLUMNS[7], instance);
            if (event.getThrowableInformation() != null) {
                arbitraryDataMap.put(COLUMNS[8], stacktrace);
            }
            Event logEvent = new Event(streamDef, date.getTime(), null, null, new String[]{tenantDomain},
                    arbitraryDataMap);
            dataPublisher.publish(logEvent);
        }
    }

    private static class ConditionalLayoutWrapper {
        TenantAwarePatternLayout wrappedLayout;
        boolean isEnabled;

        public void setWrappedLayout(TenantAwarePatternLayout wrappedLayout) {
            this.wrappedLayout = wrappedLayout;
        }

        public void setEnabled(boolean enabled) {
            isEnabled = enabled;
        }

        public String format(TenantDomainAwareLoggingEvent event) {
            if (isEnabled) {
                return wrappedLayout.format(event);
            }
            return "";
        }
    }
}

