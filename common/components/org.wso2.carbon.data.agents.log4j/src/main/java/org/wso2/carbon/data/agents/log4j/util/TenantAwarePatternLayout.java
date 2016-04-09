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


package org.wso2.carbon.data.agents.log4j.util;

import org.apache.log4j.PatternLayout;
import org.apache.log4j.helpers.FormattingInfo;
import org.apache.log4j.helpers.PatternConverter;
import org.apache.log4j.helpers.PatternParser;
import org.apache.log4j.spi.LoggingEvent;
import org.wso2.carbon.base.ServerConfiguration;
import org.wso2.carbon.context.CarbonContext;
import org.wso2.carbon.utils.logging.TenantAwareLoggingEvent;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.security.AccessController;
import java.security.PrivilegedAction;

public class TenantAwarePatternLayout extends PatternLayout {
    public static final String DEFAULT_TENANT_PATTERN = "[%T][%S]";
    private static String tenantPattern = "[%T][%S]";
    private static String superTenantText = null;

    public TenantAwarePatternLayout() {
    }

    public TenantAwarePatternLayout(String pattern) {
        super(pattern);
    }

    protected PatternParser createPatternParser(String pattern) {
        return new TenantAwarePatternLayout.TenantAwarePatternParser(pattern);
    }

    public synchronized void setTenantPattern(String tenantPattern) {
        tenantPattern = tenantPattern;
    }

    public static void setSuperTenantText(String superTenantText) {
        superTenantText = superTenantText;
    }

    private static class TenantAwarePatternParser extends PatternParser {
        InetAddress inetAddress;
        String address;
        String serverName = (String) AccessController.doPrivileged(new PrivilegedAction() {
            public String run() {
                return ServerConfiguration.getInstance().getFirstProperty("ServerKey");
            }
        });

        public TenantAwarePatternParser(String pattern) {
            super(pattern);

            try {
                this.inetAddress = InetAddress.getLocalHost();
                this.address = this.inetAddress.getHostAddress();
            } catch (UnknownHostException var3) {
                this.address = "127.0.0.1";
            }

        }

        protected void finalizeConverter(char c) {
            Object pc = null;
            switch (c) {
                case '@':
                    pc = new TenantAwarePatternLayout.TenantAwarePatternParser.AtSignPatternConverter(this.formattingInfo);
                    break;
                case 'A':
                    pc = new TenantAwarePatternLayout.TenantAwarePatternParser.AppNamePatternConverter(this.formattingInfo, this.extractPrecisionOption());
                    break;
                case 'B':
                case 'C':
                case 'E':
                case 'F':
                case 'G':
                case 'J':
                case 'K':
                case 'L':
                case 'M':
                case 'N':
                case 'O':
                case 'Q':
                case 'R':
                default:
                    super.finalizeConverter(c);
                    break;
                case 'D':
                    pc = new TenantAwarePatternLayout.TenantAwarePatternParser.TenantDomainPatternConverter(this.formattingInfo, this.extractPrecisionOption());
                    break;
                case 'H':
                    pc = new TenantAwarePatternLayout.TenantAwarePatternParser.HostNamePatternConverter(this.formattingInfo, this.extractPrecisionOption(), this.address);
                    break;
                case 'I':
                    pc = new TenantAwarePatternLayout.TenantAwarePatternParser.InstanceIdPatternConverter(this.formattingInfo, this.extractPrecisionOption());
                    break;
                case 'P':
                    pc = new TenantAwarePatternLayout.TenantAwarePatternParser.TenantPatternConverter(this.formattingInfo, this.extractPrecisionOption());
                    break;
                case 'S':
                    pc = new TenantAwarePatternLayout.TenantAwarePatternParser.ServerNamePatternConverter(this.formattingInfo, this.extractPrecisionOption(), this.serverName);
                    break;
                case 'T':
                    pc = new TenantAwarePatternLayout.TenantAwarePatternParser.TenantIdPatternConverter(this.formattingInfo, this.extractPrecisionOption());
                    break;
                case 'U':
                    pc = new TenantAwarePatternLayout.TenantAwarePatternParser.UserNamePatternConverter(this.formattingInfo, this.extractPrecisionOption());
            }

            if (pc != null) {
                this.currentLiteral.setLength(0);
                this.addConverter((PatternConverter) pc);
            }

        }

        private static class TenantPatternConverter extends TenantAwarePatternLayout.TenantAwarePatternParser.TenantAwareNamedPatternConverter {
            public TenantPatternConverter(FormattingInfo formattingInfo, int precision) {
                super(formattingInfo, precision);
            }

            public String getFullyQualifiedName(LoggingEvent event) {
                int tenantId = ((Integer) AccessController.doPrivileged(new PrivilegedAction() {
                    public Integer run() {
                        return Integer.valueOf(CarbonContext.getThreadLocalCarbonContext().getTenantId());
                    }
                })).intValue();
                return tenantId != -1 && tenantId != -1234 ? (new TenantAwarePatternLayout(TenantAwarePatternLayout.tenantPattern)).format(event) : TenantAwarePatternLayout.superTenantText;
            }
        }

        private static class AtSignPatternConverter extends TenantAwarePatternLayout.TenantAwarePatternParser.TenantAwareNamedPatternConverter {
            public AtSignPatternConverter(FormattingInfo formattingInfo) {
                super(formattingInfo, -1);
            }

            public String getFullyQualifiedName(LoggingEvent event) {
                return CarbonContext.getThreadLocalCarbonContext().getTenantDomain() != null ? "@" : null;
            }
        }

        private static class AppNamePatternConverter extends TenantAwarePatternLayout.TenantAwarePatternParser.TenantAwareNamedPatternConverter {
            public AppNamePatternConverter(FormattingInfo formattingInfo, int precision) {
                super(formattingInfo, precision);
            }

            public String getFullyQualifiedName(LoggingEvent event) {
                if (event instanceof TenantAwareLoggingEvent) {
                    return ((TenantAwareLoggingEvent) event).getServiceName() != null ? ((TenantAwareLoggingEvent) event).getServiceName() : "";
                } else {
                    String appName = CarbonContext.getThreadLocalCarbonContext().getApplicationName();
                    return appName != null ? appName : "";
                }
            }
        }

        private static class InstanceIdPatternConverter extends TenantAwarePatternLayout.TenantAwarePatternParser.TenantAwareNamedPatternConverter {
            public InstanceIdPatternConverter(FormattingInfo formattingInfo, int precision) {
                super(formattingInfo, precision);
            }

            public String getFullyQualifiedName(LoggingEvent event) {
                String stratosInstance = System.getProperty("carbon.instance.name");
                return stratosInstance != null ? stratosInstance : "";
            }
        }

        private static class HostNamePatternConverter extends TenantAwarePatternLayout.TenantAwarePatternParser.TenantAwareNamedPatternConverter {
            String address;

            public HostNamePatternConverter(FormattingInfo formattingInfo, int precision, String hostAddress) {
                super(formattingInfo, precision);
                this.address = hostAddress;
            }

            public String getFullyQualifiedName(LoggingEvent event) {
                return this.address;
            }
        }

        private static class ServerNamePatternConverter extends TenantAwarePatternLayout.TenantAwarePatternParser.TenantAwareNamedPatternConverter {
            String name;

            public ServerNamePatternConverter(FormattingInfo formattingInfo, int precision, String serverName) {
                super(formattingInfo, precision);
                this.name = serverName;
            }

            public String getFullyQualifiedName(LoggingEvent event) {
                return this.name;
            }
        }

        private static class TenantDomainPatternConverter extends TenantAwarePatternLayout.TenantAwarePatternParser.TenantAwareNamedPatternConverter {
            public TenantDomainPatternConverter(FormattingInfo formattingInfo, int precision) {
                super(formattingInfo, precision);
            }

            public String getFullyQualifiedName(LoggingEvent event) {
                return CarbonContext.getThreadLocalCarbonContext().getTenantDomain();
            }
        }

        private static class UserNamePatternConverter extends TenantAwarePatternLayout.TenantAwarePatternParser.TenantAwareNamedPatternConverter {
            public UserNamePatternConverter(FormattingInfo formattingInfo, int precision) {
                super(formattingInfo, precision);
            }

            public String getFullyQualifiedName(LoggingEvent event) {
                return CarbonContext.getThreadLocalCarbonContext().getUsername();
            }
        }

        private static class TenantIdPatternConverter extends TenantAwarePatternLayout.TenantAwarePatternParser.TenantAwareNamedPatternConverter {
            public TenantIdPatternConverter(FormattingInfo formattingInfo, int precision) {
                super(formattingInfo, precision);
            }

            public String getFullyQualifiedName(LoggingEvent event) {
                if (event instanceof TenantAwareLoggingEvent) {
                    return ((TenantAwareLoggingEvent) event).getTenantId();
                } else {
                    int tenantId = ((Integer) AccessController.doPrivileged(new PrivilegedAction() {
                        public Integer run() {
                            return Integer.valueOf(CarbonContext.getThreadLocalCarbonContext().getTenantId());
                        }
                    })).intValue();
                    return tenantId != -1 ? Integer.toString(tenantId) : null;
                }
            }
        }

        private abstract static class TenantAwareNamedPatternConverter extends PatternConverter {
            private int precision;

            public TenantAwareNamedPatternConverter(FormattingInfo formattingInfo, int precision) {
                super(formattingInfo);
                this.precision = precision;
            }

            protected abstract String getFullyQualifiedName(LoggingEvent var1);

            public String convert(LoggingEvent event) {
                String n = this.getFullyQualifiedName(event);
                if (n == null) {
                    return "";
                } else if (this.precision <= 0) {
                    return n;
                } else {
                    int len = n.length();
                    int end = len - 1;

                    for (int i = this.precision; i > 0; --i) {
                        end = n.lastIndexOf(46, end - 1);
                        if (end == -1) {
                            return n;
                        }
                    }

                    return n.substring(end + 1, len);
                }
            }
        }
    }
}
