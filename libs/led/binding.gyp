{
    'targets': [
        {
            'target_name': 'ledAddon',
            'sources': ['src/main.cc'],
            'include_dirs': [
                "<!@(node -p \"require('node-addon-api').include_dir\")",
                "/usr/local/include/node"
            ],
            'dependencies': ["<!(node -p \"require('node-addon-api').gyp\")"],
            'cflags!': ['-fno-exceptions'],
            'cflags_cc!': ['-fno-exceptions'],
            'defines': ['NAPI_CPP_EXCEPTIONS']
        }
    ]
}
