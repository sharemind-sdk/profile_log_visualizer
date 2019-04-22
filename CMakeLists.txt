#
# This file is a part of the Sharemind framework.
# Copyright (C) Cybernetica AS
#
# All rights are reserved. Reproduction in whole or part is prohibited
# without the written consent of the copyright owner. The usage of this
# code is subject to the appropriate license agreement.
#
CMAKE_MINIMUM_REQUIRED(VERSION 3.0.0)
PROJECT(profile-log-visualizer VERSION 1.0.2 LANGUAGES)

INCLUDE("${CMAKE_CURRENT_SOURCE_DIR}/config.local" OPTIONAL)
INCLUDE("${CMAKE_CURRENT_BINARY_DIR}/config.local" OPTIONAL)

FIND_PACKAGE(SharemindCMakeHelpers 1.3 REQUIRED)

IF(DEFINED SHAREMIND_NPM_REGISTRY)
  SET(NPM_REGISTRY "--registry" ${SHAREMIND_NPM_REGISTRY})
ENDIF()

FIND_PROGRAM(NPM NAMES "npm")
IF(NOT NPM)
    MESSAGE(FATAL_ERROR "Required \"npm\" program not found!")
ENDIF()

# Dir where the source files are copied and npm install is run in
SET(NPM_BUILD_DIR ${CMAKE_CURRENT_BINARY_DIR}/tmp)

# Names of the binaries created by pkg and electron-packager
SET(PROJECT_GUI_BIN "sharemind-profile-visualizer-gui")
SET(PROJECT_CLI_BIN "sharemind-profile-visualizer-cli")
# NodeJS version packaged in the cli app binary
SET(PROJECT_NODEJS_VERSION "6")
SET(PROJECT_PLATFORM "linux")
SET(PROJECT_ARCH "x64")
SET(PROJECT_GUI_BIN_PATH
  ${NPM_BUILD_DIR}/${PROJECT_GUI_BIN}-${PROJECT_PLATFORM}-${PROJECT_ARCH}/${PROJECT_GUI_BIN})

# Use --ignore-scripts as we will run build anyway
# this way we only install dependencies here
SET(NPM_INSTALL_COMMAND ${NPM} install --ignore-scripts ${NPM_REGISTRY})
# Run the packaging npm scripts
SET(NPM_CLI_BUILD_COMMAND ${NPM} run-script package-cli && ${NPM} run-script package-gui )
# Create a list of project files we can use as a dependency for build command,
# if any of the files change then build is re-run.
FILE(GLOB_RECURSE PROJECT_FILES
  "${NPM_BUILD_DIR}/app/*"
)
FILE(COPY "${CMAKE_CURRENT_SOURCE_DIR}/app" DESTINATION "${NPM_BUILD_DIR}")
CONFIGURE_FILE("${CMAKE_CURRENT_SOURCE_DIR}/package.json" "${NPM_BUILD_DIR}/package.json" @ONLY)

# npm install
SET(NPM_INSTALL_STATUS ${CMAKE_CURRENT_BINARY_DIR}/tmp/npminstall.txt)
ADD_CUSTOM_COMMAND(
    OUTPUT ${NPM_INSTALL_STATUS}
    COMMAND ${NPM_INSTALL_COMMAND}
    COMMAND ${CMAKE_COMMAND} -E touch ${NPM_INSTALL_STATUS}
    WORKING_DIRECTORY ${NPM_BUILD_DIR}
    COMMENT "npm install"
    DEPENDS ${NPM_BUILD_DIR}/package.json
    )
# build packages
ADD_CUSTOM_COMMAND(
    OUTPUT "${NPM_BUILD_DIR}/${PROJECT_CLI_BIN}" ${PROJECT_GUI_BIN_PATH}
    COMMAND ${NPM_CLI_BUILD_COMMAND}
    WORKING_DIRECTORY ${NPM_BUILD_DIR}
    COMMENT "run-script package-cli && package-gui"
    DEPENDS ${NPM_INSTALL_STATUS} ${PROJECT_FILES}
    )
ADD_CUSTOM_TARGET(
    npm ALL
    DEPENDS "${PROJECT_GUI_BIN_PATH}" "${NPM_BUILD_DIR}/${PROJECT_CLI_BIN}"
    )
INSTALL(
        PROGRAMS "${NPM_BUILD_DIR}/${PROJECT_CLI_BIN}"
        DESTINATION bin
        COMPONENT bin
)
INSTALL(
        PROGRAMS ${PROJECT_GUI_BIN_PATH}
        DESTINATION share/${PROJECT_GUI_BIN}-${PROJECT_PLATFORM}-${PROJECT_ARCH}
        COMPONENT bin
)
INSTALL(
        DIRECTORY ${NPM_BUILD_DIR}/${PROJECT_GUI_BIN}-${PROJECT_PLATFORM}-${PROJECT_ARCH}
        DESTINATION share
        COMPONENT bin
        PATTERN ${PROJECT_GUI_BIN} EXCLUDE
)
# Generate symlink for gui app
INSTALL(CODE "execute_process(COMMAND ${CMAKE_COMMAND} -E create_symlink ../share/${PROJECT_GUI_BIN}-${PROJECT_PLATFORM}-${PROJECT_ARCH}/${PROJECT_GUI_BIN} bin/${PROJECT_GUI_BIN} WORKING_DIRECTORY ${CMAKE_INSTALL_PREFIX})" COMPONENT bin)
# Install symlinks as FILES so that they would be included in packaging
INSTALL(
    FILES ${CMAKE_INSTALL_PREFIX}/bin/${PROJECT_GUI_BIN}
    DESTINATION bin
    COMPONENT bin
)
# Packaging:
SharemindSetupPackaging()
SharemindAddComponentPackage(bin
    NAME "sharemind-profile-log-visualizer"
    DESCRIPTION "Sharemind profile log visualizer GUI application"
    DEB_SECTION "devel"
    DEB_DEPENDS
        "libasound2 (>= 1.1.0)"
        "libgtk-3-0 (>= 3.22.0)"
        "libnss3 (>= 3.26.0)"
        "libx11-xcb1 (>= 1.6.0)"
        "libxss1 (>= 1.2.0)"
)
SharemindPackagingFinalize()
